import {
  DASH,
  couponFrequency,
  fmtDate,
  fmtDuration,
  fmtListLevel,
  fmtMoney,
  fmtPct,
  fmtSignedPct,
  fmtUntil,
} from "./format";
import {
  hasAmortization,
  initialFaceValue,
  isYieldMisleading,
  nextOffer,
  remainingAmortizations,
  upcomingCoupons,
} from "./moex";
import { BondDetail as BondDetailData, Bondization, Coupon } from "./types";

/** ISS часто пишет в offertype просто «Оферта» — дублировать это в подписи незачем. */
export function offerType(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return /^оферта$/i.test(trimmed) ? null : trimmed;
}

export function priceHeadline(bond: BondDetailData): string {
  if (bond.price.value === null) return "Цены нет";
  return `${bond.price.value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} %`;
}

export function changeLine(bond: BondDetailData): string {
  const parts: string[] = [];
  if (bond.changePct !== null) {
    const arrow = bond.changePct > 0 ? "▲" : bond.changePct < 0 ? "▼" : "•";
    parts.push(`${arrow} ${fmtSignedPct(bond.changePct)} за день`);
  }
  if (bond.price.label) parts.push(bond.price.label);
  if (bond.yieldPct !== null) parts.push(`доходность ${fmtPct(bond.yieldPct)}`);
  return parts.join(" · ");
}

export function couponRow(coupon: Coupon, faceUnit: string | null): string {
  // Ставку не дублируем: она есть в боковой панели, а в узкой колонке заголовок переносился.
  const value = coupon.value === null ? "ставка ещё не объявлена" : fmtMoney(coupon.value, coupon.faceUnit ?? faceUnit);
  const until = fmtUntil(coupon.date);
  return `| ${fmtDate(coupon.date)} | ${value} | ${until ?? DASH} |`;
}

export function buildMarkdown(
  bond: BondDetailData,
  bondization: Bondization | undefined,
  emitent?: string | null,
): string {
  const lines: string[] = [];
  lines.push(`# ${priceHeadline(bond)}`);
  lines.push("");
  lines.push(`**${bond.shortname}**${bond.fullname ? ` · ${bond.fullname}` : ""}`);
  if (emitent) lines.push(`\n${emitent}`);
  const change = changeLine(bond);
  if (change) lines.push(`\n${change}`);

  if (isYieldMisleading(bond.durationDays, bond.yieldPct)) {
    const until = fmtUntil(bond.matDate) ?? "на днях";
    lines.push(
      `\n> Погашение ${until}. На таком горизонте годовая доходность — число условное: MOEX пересчитывает в годовые копеечную разницу с номиналом. Смотрите на саму цену, а не на процент.`,
    );
  }

  const coupons = upcomingCoupons(bondization?.coupons ?? []);
  if (coupons.length > 0) {
    lines.push("\n---\n");
    lines.push("### Ближайшие купоны\n");
    lines.push("| Дата | Выплата | Когда |");
    lines.push("| --- | --- | --- |");
    for (const coupon of coupons) lines.push(couponRow(coupon, bond.faceUnit));
  }

  const amortizations = bondization?.amortizations ?? [];
  if (hasAmortization(amortizations)) {
    const remaining = remainingAmortizations(amortizations);
    const paid = amortizations.length - remaining.length;
    lines.push("\n### Амортизация\n");
    if (paid > 0) lines.push(`Уже выплачено ${paid} из ${amortizations.length} частей номинала.\n`);
    lines.push("| Дата | Доля номинала | Сумма | Когда |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of remaining) {
      lines.push(
        `| ${fmtDate(item.date)} | ${fmtPct(item.percent)} | ${fmtMoney(item.value, item.faceUnit ?? bond.faceUnit)} | ${
          fmtUntil(item.date) ?? DASH
        } |`,
      );
    }
  }

  if (bond.price.value === null) {
    lines.push("\n> Рыночных данных по бумаге нет — вероятно, по ней давно не было сделок.");
  }

  return lines.join("\n");
}

export function buildPlainText(
  bond: BondDetailData,
  bondization: Bondization | undefined,
  emitent?: string | null,
): string {
  const offer = nextOffer(bondization?.offers ?? []);
  const face = bond.faceValue ?? bond.currentFaceValue;
  const issuedFace = initialFaceValue(bondization?.amortizations ?? []);
  const rows: string[] = [
    `${bond.shortname}${bond.fullname ? ` — ${bond.fullname}` : ""}`,
    emitent ? `Эмитент: ${emitent}` : "",
    `ISIN: ${bond.isin ?? DASH} · код: ${bond.secid} · режим: ${bond.boardid ?? DASH}`,
    `Цена: ${priceHeadline(bond)}${bond.price.label ? ` (${bond.price.label})` : ""}`,
    `Доходность: ${bond.yieldPct === null ? DASH : fmtPct(bond.yieldPct)}`,
    `Дюрация: ${fmtDuration(bond.durationDays)}`,
    `Купон: ${bond.couponPercent === null ? DASH : fmtPct(bond.couponPercent)} · ${fmtMoney(bond.couponValue, bond.faceUnit)} · ${
      couponFrequency(bond.couponPeriod) ?? DASH
    }`,
    `НКД: ${fmtMoney(bond.accruedInt, bond.faceUnit)}`,
    `Ближайший купон: ${fmtDate(bond.nextCoupon)}`,
    `Погашение: ${fmtDate(bond.matDate)}`,
    offer?.date ? `Оферта: ${fmtDate(offer.date)}${offerType(offer.type) ? ` (${offerType(offer.type)})` : ""}` : "",
    `Амортизация: ${hasAmortization(bondization?.amortizations ?? []) ? "есть" : "нет"}`,
    `Номинал: ${fmtMoney(face, bond.faceUnit)}${
      issuedFace !== null && face !== null && issuedFace !== face
        ? ` (при выпуске ${fmtMoney(issuedFace, bond.faceUnit)})`
        : ""
    }`,
    `Листинг: ${fmtListLevel(bond.listLevel)}`,
    `Данные MOEX ISS, ${new Date().toLocaleString("ru-RU")}`,
  ];
  return rows.filter(Boolean).join("\n");
}
