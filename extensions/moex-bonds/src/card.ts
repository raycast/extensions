import { DASH, Formatter } from "./format";
import {
  hasAmortization,
  initialFaceValue,
  isYieldMisleading,
  nextOffer,
  remainingAmortizations,
  upcomingCoupons,
} from "./moex";
import { Strings, priceLabel } from "./strings";
import { BondDetail as BondDetailData, Bondization, Coupon } from "./types";

/** ISS часто пишет в offertype просто «Оферта» — дублировать это в подписи незачем. */
export function offerType(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return /^оферта$/i.test(trimmed) ? null : trimmed;
}

export function priceHeadline(bond: BondDetailData, fmt: Formatter, t: Strings): string {
  if (bond.price.value === null) return t.noPrice;
  return `${fmt.loose(bond.price.value, 3)}${fmt.language === "ru" ? " %" : "%"}`;
}

export function changeLine(bond: BondDetailData, fmt: Formatter, t: Strings): string {
  const parts: string[] = [];
  if (bond.changePct !== null) {
    const arrow = bond.changePct > 0 ? "▲" : bond.changePct < 0 ? "▼" : "•";
    parts.push(`${arrow} ${fmt.signedPct(bond.changePct)} ${t.perDay}`);
  }
  const source = priceLabel(bond.price, fmt, t);
  if (source) parts.push(source);
  if (bond.yieldPct !== null) parts.push(`${t.yieldWord} ${fmt.pct(bond.yieldPct)}`);
  return parts.join(" · ");
}

export function couponRow(coupon: Coupon, faceUnit: string | null, fmt: Formatter, t: Strings): string {
  // Ставку не дублируем: она есть в боковой панели, а в узкой колонке заголовок переносился.
  const value = coupon.value === null ? t.rateNotAnnounced : fmt.money(coupon.value, coupon.faceUnit ?? faceUnit);
  return `| ${fmt.date(coupon.date)} | ${value} | ${fmt.until(coupon.date) ?? DASH} |`;
}

export function buildMarkdown(
  bond: BondDetailData,
  bondization: Bondization | undefined,
  emitent: string | null | undefined,
  fmt: Formatter,
  t: Strings,
): string {
  const lines: string[] = [];
  lines.push(`# ${priceHeadline(bond, fmt, t)}`);
  lines.push("");
  lines.push(`**${bond.shortname}**${bond.fullname ? ` · ${bond.fullname}` : ""}`);
  if (emitent) lines.push(`\n${emitent}`);
  const change = changeLine(bond, fmt, t);
  if (change) lines.push(`\n${change}`);

  if (isYieldMisleading(bond.durationDays, bond.yieldPct)) {
    lines.push(t.shortHorizonNote(fmt.until(bond.matDate) ?? t.maturesSoon));
  }

  const coupons = upcomingCoupons(bondization?.coupons ?? []);
  if (coupons.length > 0) {
    lines.push("\n---\n");
    lines.push(`### ${t.upcomingCoupons}\n`);
    lines.push(`| ${t.colDate} | ${t.colPayment} | ${t.colWhen} |`);
    lines.push("| --- | --- | --- |");
    for (const coupon of coupons) lines.push(couponRow(coupon, bond.faceUnit, fmt, t));
  }

  const amortizations = bondization?.amortizations ?? [];
  if (hasAmortization(amortizations)) {
    const remaining = remainingAmortizations(amortizations);
    const paid = amortizations.length - remaining.length;
    lines.push(`\n### ${t.amortization}\n`);
    if (paid > 0) lines.push(`${t.amortizationPaid(paid, amortizations.length)}\n`);
    lines.push(`| ${t.colDate} | ${t.colShare} | ${t.colAmount} | ${t.colWhen} |`);
    lines.push("| --- | --- | --- | --- |");
    for (const item of remaining) {
      lines.push(
        `| ${fmt.date(item.date)} | ${fmt.pct(item.percent)} | ${fmt.money(item.value, item.faceUnit ?? bond.faceUnit)} | ${
          fmt.until(item.date) ?? DASH
        } |`,
      );
    }
  }

  if (bond.price.value === null) lines.push(`\n${t.noMarketDataNote}`);

  return lines.join("\n");
}

export function buildPlainText(
  bond: BondDetailData,
  bondization: Bondization | undefined,
  emitent: string | null | undefined,
  fmt: Formatter,
  t: Strings,
): string {
  const offer = nextOffer(bondization?.offers ?? []);
  const face = bond.faceValue ?? bond.currentFaceValue;
  const issuedFace = initialFaceValue(bondization?.amortizations ?? []);
  const offerLabel = offerType(offer?.type);
  const rows: string[] = [
    `${bond.shortname}${bond.fullname ? ` — ${bond.fullname}` : ""}`,
    emitent ? `${t.issuer}: ${emitent}` : "",
    `${t.isin}: ${bond.isin ?? DASH} · ${t.securityCode}: ${bond.secid} · ${t.board}: ${bond.boardid ?? DASH}`,
    `${t.price}: ${priceHeadline(bond, fmt, t)}${priceLabel(bond.price, fmt, t) ? ` (${priceLabel(bond.price, fmt, t)})` : ""}`,
    `${t.yieldToMaturity}: ${fmt.pct(bond.yieldPct)}`,
    `${t.duration}: ${fmt.duration(bond.durationDays)}`,
    `${t.coupon}: ${fmt.pct(bond.couponPercent)} · ${fmt.money(bond.couponValue, bond.faceUnit)} · ${
      fmt.couponFrequency(bond.couponPeriod) ?? DASH
    }`,
    `${t.accruedInterest}: ${fmt.money(bond.accruedInt, bond.faceUnit)}`,
    `${t.nextCoupon}: ${fmt.date(bond.nextCoupon)}`,
    `${t.maturity}: ${fmt.date(bond.matDate)}`,
    offer?.date ? `${t.offer}: ${fmt.date(offer.date)}${offerLabel ? ` (${offerLabel})` : ""}` : "",
    `${t.amortization}: ${hasAmortization(bondization?.amortizations ?? []) ? t.amortizationYes : t.amortizationNo}`,
    `${t.faceValue}: ${fmt.money(face, bond.faceUnit)}${
      issuedFace !== null && face !== null && issuedFace !== face
        ? ` ${t.atIssue(fmt.money(issuedFace, bond.faceUnit))}`
        : ""
    }`,
    `${t.listing}: ${fmt.listLevel(bond.listLevel)}`,
    t.sourceLine(new Date().toLocaleString(fmt.language === "ru" ? "ru-RU" : "en-US")),
  ];
  return rows.filter(Boolean).join("\n");
}
