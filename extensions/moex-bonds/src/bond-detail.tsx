import { Action, ActionPanel, Color, Detail, Icon, Toast, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef } from "react";

import { getFavorites, isFavoriteSecid, toggleFavorite } from "./favorites";
import {
  DASH,
  couponFrequency,
  fmtBigMoney,
  fmtDate,
  fmtDuration,
  fmtListLevel,
  fmtMoney,
  fmtPct,
  fmtUntil,
} from "./format";
import {
  fetchBond,
  fetchBondization,
  hasAmortization,
  initialFaceValue,
  moexUrl,
  nextOffer,
  smartLabUrl,
} from "./moex";
import { buildMarkdown, buildPlainText, offerType } from "./card";
import { BondDetail as BondDetailData, Bondization } from "./types";

interface Props {
  secid: string;
  shortname: string;
  boardid: string | null;
  emitent?: string | null;
  onFavoritesChange?: () => void;
}

export default function BondDetailView({ secid, shortname, boardid, emitent, onFavoritesChange }: Props) {
  const abortable = useRef<AbortController>(null);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (id: string, board: string | null) => {
      const signal = abortable.current?.signal;
      const [bond, bondization] = await Promise.all([fetchBond(id, board, signal), fetchBondization(id, signal)]);
      return { bond, bondization };
    },
    [secid, boardid],
    { abortable, keepPreviousData: true },
  );

  const { data: favorites, revalidate: reloadFavorites } = useCachedPromise(getFavorites, [], { initialData: [] });
  const starred = isFavoriteSecid(favorites ?? [], secid);

  const onToggleFavorite = useCallback(async () => {
    await toggleFavorite({ secid, shortname: data?.bond.shortname ?? shortname, boardid });
    reloadFavorites();
    onFavoritesChange?.();
    await showToast({
      style: Toast.Style.Success,
      title: starred ? "Убрано из избранного" : "Добавлено в избранное",
      message: data?.bond.shortname ?? shortname,
    });
  }, [secid, shortname, boardid, data, starred, reloadFavorites, onFavoritesChange]);

  if (error && !data) {
    return (
      <Detail
        markdown={`# Не получилось загрузить\n\n${error.message}\n\nMOEX ISS мог не ответить или пропал интернет.`}
        actions={
          <ActionPanel>
            <Action title="Повторить" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const bond = data?.bond;
  const bondization = data?.bondization;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={bond?.shortname ?? shortname}
      markdown={bond ? buildMarkdown(bond, bondization, emitent) : "Загружаю данные MOEX…"}
      metadata={bond ? buildMetadata(bond, bondization, emitent) : undefined}
      actions={
        <ActionPanel>
          <Action
            title={starred ? "Убрать из избранного" : "В избранное"}
            icon={starred ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <Action
            title="Обновить"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <ActionPanel.Section title="Скопировать">
            {bond?.isin ? (
              <Action.CopyToClipboard title="ISIN" content={bond.isin} shortcut={Keyboard.Shortcut.Common.Copy} />
            ) : null}
            <Action.CopyToClipboard title="Код бумаги" content={secid} />
            {bond ? (
              <Action.CopyToClipboard title="Карточку текстом" content={buildPlainText(bond, bondization, emitent)} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Открыть">
            <OpenLinks secid={secid} boardid={bond?.boardid ?? boardid} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function OpenLinks({ secid, boardid }: { secid: string; boardid: string | null }) {
  const moex = moexUrl(secid, boardid);
  const smartLab = smartLabUrl(secid);
  return (
    <>
      {moex ? <Action.OpenInBrowser title="На MOEX" url={moex} /> : null}
      {smartLab ? <Action.OpenInBrowser title="На Smart-Lab" url={smartLab} /> : null}
    </>
  );
}

function buildMetadata(bond: BondDetailData, bondization: Bondization | undefined, emitent?: string | null) {
  const offer = nextOffer(bondization?.offers ?? []);
  const offerDate = offer?.date ?? bond.offerDate ?? bond.putOptionDate ?? bond.callOptionDate;
  const amortized = hasAmortization(bondization?.amortizations ?? []);
  const matUntil = fmtUntil(bond.matDate);
  const couponUntil = fmtUntil(bond.nextCoupon);
  const offerUntil = fmtUntil(offerDate);
  const face = bond.faceValue ?? bond.currentFaceValue;
  const issuedFace = initialFaceValue(bondization?.amortizations ?? []);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Доходность к погашению"
        text={bond.yieldPct === null ? DASH : fmtPct(bond.yieldPct)}
        icon={bond.yieldPct === null ? undefined : { source: Icon.LineChart, tintColor: Color.Green }}
      />
      {bond.yieldToOffer !== null ? (
        <Detail.Metadata.Label title="Доходность к оферте" text={fmtPct(bond.yieldToOffer)} />
      ) : null}
      <Detail.Metadata.Label title="Дюрация" text={fmtDuration(bond.durationDays)} />
      <Detail.Metadata.Label title="НКД" text={fmtMoney(bond.accruedInt, bond.faceUnit)} />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Купон"
        text={`${bond.couponPercent === null ? DASH : fmtPct(bond.couponPercent)} · ${fmtMoney(bond.couponValue, bond.faceUnit)}`}
      />
      <Detail.Metadata.Label title="Периодичность" text={couponFrequency(bond.couponPeriod) ?? DASH} />
      <Detail.Metadata.Label
        title="Ближайший купон"
        text={`${fmtDate(bond.nextCoupon)}${couponUntil ? ` · ${couponUntil}` : ""}`}
      />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Погашение" text={`${fmtDate(bond.matDate)}${matUntil ? ` · ${matUntil}` : ""}`} />
      {offerDate ? (
        <Detail.Metadata.Label
          title={offerType(offer?.type) ? `Оферта (${offerType(offer?.type)})` : "Оферта"}
          text={`${fmtDate(offerDate)}${offerUntil ? ` · ${offerUntil}` : ""}`}
          icon={{ source: Icon.Alarm, tintColor: Color.Orange }}
        />
      ) : null}
      <Detail.Metadata.TagList title="Амортизация">
        <Detail.Metadata.TagList.Item
          text={amortized ? "есть" : "нет, погашение разом"}
          color={amortized ? Color.Orange : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Номинал"
        text={`${fmtMoney(face, bond.faceUnit)}${
          issuedFace !== null && face !== null && issuedFace !== face
            ? ` (при выпуске ${fmtMoney(issuedFace, bond.faceUnit)})`
            : ""
        }`}
      />
      <Detail.Metadata.Label
        title="В обращении"
        text={
          bond.issueSizePlaced === null || face === null
            ? DASH
            : `${fmtBigMoney(bond.issueSizePlaced * face, bond.faceUnit)} · ${bond.issueSizePlaced.toLocaleString("ru-RU")} шт.`
        }
      />
      <Detail.Metadata.TagList title="Тип выпуска">
        {bond.bondType ? <Detail.Metadata.TagList.Item text={bond.bondType} color={Color.Blue} /> : null}
        {bond.bondSubtype ? <Detail.Metadata.TagList.Item text={bond.bondSubtype} color={Color.SecondaryText} /> : null}
        <Detail.Metadata.TagList.Item
          text={fmtListLevel(bond.listLevel)}
          color={bond.listLevel === 3 ? Color.Orange : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />

      {emitent ? <Detail.Metadata.Label title="Эмитент" text={emitent} /> : null}
      <Detail.Metadata.Label title="ISIN" text={bond.isin ?? DASH} />
      <Detail.Metadata.Label title="Код бумаги" text={bond.secid} />
      <Detail.Metadata.Label title="Режим торгов" text={bond.boardName ?? bond.boardid ?? DASH} />
    </Detail.Metadata>
  );
}
