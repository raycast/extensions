import { FieldDef, FieldOption, TemplateKind } from "./types";

export const OBJECTIVES: FieldOption[] = [
  { value: "OUTCOME_SALES", title: "매출 (OUTCOME_SALES)" },
  { value: "OUTCOME_TRAFFIC", title: "트래픽 (OUTCOME_TRAFFIC)" },
  { value: "OUTCOME_LEADS", title: "리드 (OUTCOME_LEADS)" },
  { value: "OUTCOME_AWARENESS", title: "인지도 (OUTCOME_AWARENESS)" },
  { value: "OUTCOME_ENGAGEMENT", title: "참여 (OUTCOME_ENGAGEMENT)" },
  { value: "OUTCOME_APP_PROMOTION", title: "앱 홍보 (OUTCOME_APP_PROMOTION)" },
];

export const STATUSES: FieldOption[] = [
  { value: "PAUSED", title: "일시 중지 (PAUSED)" },
  { value: "ACTIVE", title: "활성 (ACTIVE)" },
];

export const OPTIMIZATION_GOALS: FieldOption[] = [
  { value: "OFFSITE_CONVERSIONS", title: "전환 (OFFSITE_CONVERSIONS)" },
  { value: "LINK_CLICKS", title: "링크 클릭 (LINK_CLICKS)" },
  { value: "LANDING_PAGE_VIEWS", title: "랜딩 페이지 조회 (LANDING_PAGE_VIEWS)" },
  { value: "IMPRESSIONS", title: "노출 (IMPRESSIONS)" },
  { value: "REACH", title: "도달 (REACH)" },
  { value: "LEAD_GENERATION", title: "리드 (LEAD_GENERATION)" },
  { value: "VALUE", title: "가치 (VALUE)" },
  { value: "APP_INSTALLS", title: "앱 설치 (APP_INSTALLS)" },
  { value: "CONVERSATIONS", title: "대화 (CONVERSATIONS)" },
  { value: "PAGE_LIKES", title: "페이지 좋아요 (PAGE_LIKES)" },
  { value: "POST_ENGAGEMENT", title: "게시물 참여 (POST_ENGAGEMENT)" },
  { value: "EVENT_RESPONSES", title: "이벤트 응답 (EVENT_RESPONSES)" },
  { value: "THRUPLAY", title: "ThruPlay (THRUPLAY)" },
];

export const BILLING_EVENTS: FieldOption[] = [
  { value: "IMPRESSIONS", title: "노출 (IMPRESSIONS)" },
  { value: "LINK_CLICKS", title: "링크 클릭 (LINK_CLICKS)" },
  { value: "CLICKS", title: "클릭 (CLICKS)" },
  { value: "APP_INSTALLS", title: "앱 설치 (APP_INSTALLS)" },
  { value: "PAGE_LIKES", title: "페이지 좋아요 (PAGE_LIKES)" },
  { value: "POST_ENGAGEMENT", title: "게시물 참여 (POST_ENGAGEMENT)" },
  { value: "THRUPLAY", title: "ThruPlay (THRUPLAY)" },
];

export const CUSTOM_EVENT_TYPES: FieldOption[] = [
  { value: "PURCHASE", title: "구매 (PURCHASE)" },
  { value: "LEAD", title: "리드 (LEAD)" },
  { value: "COMPLETE_REGISTRATION", title: "가입 완료 (COMPLETE_REGISTRATION)" },
  { value: "ADD_TO_CART", title: "장바구니 담기 (ADD_TO_CART)" },
  { value: "INITIATED_CHECKOUT", title: "결제 시작 (INITIATED_CHECKOUT)" },
  { value: "ADD_PAYMENT_INFO", title: "결제 정보 추가 (ADD_PAYMENT_INFO)" },
  { value: "CONTENT_VIEW", title: "콘텐츠 조회 (CONTENT_VIEW)" },
  { value: "SEARCH", title: "검색 (SEARCH)" },
  { value: "SUBSCRIBE", title: "구독 (SUBSCRIBE)" },
  { value: "CONTACT", title: "연락 (CONTACT)" },
  { value: "ADD_TO_WISHLIST", title: "위시리스트 (ADD_TO_WISHLIST)" },
  { value: "CUSTOMIZE_PRODUCT", title: "상품 맞춤 (CUSTOMIZE_PRODUCT)" },
  { value: "DONATE", title: "기부 (DONATE)" },
  { value: "FIND_LOCATION", title: "위치 찾기 (FIND_LOCATION)" },
  { value: "SCHEDULE", title: "예약 (SCHEDULE)" },
  { value: "START_TRIAL", title: "체험 시작 (START_TRIAL)" },
  { value: "SUBMIT_APPLICATION", title: "신청 제출 (SUBMIT_APPLICATION)" },
  { value: "OTHER", title: "기타 (OTHER)" },
];

export const CALL_TO_ACTIONS: FieldOption[] = [
  { value: "SHOP_NOW", title: "지금 쇼핑하기 (SHOP_NOW)" },
  { value: "LEARN_MORE", title: "더 알아보기 (LEARN_MORE)" },
  { value: "SIGN_UP", title: "가입하기 (SIGN_UP)" },
  { value: "SUBSCRIBE", title: "구독하기 (SUBSCRIBE)" },
  { value: "DOWNLOAD", title: "다운로드 (DOWNLOAD)" },
  { value: "BOOK_TRAVEL", title: "여행 예약 (BOOK_TRAVEL)" },
  { value: "BUY_NOW", title: "지금 구매 (BUY_NOW)" },
  { value: "APPLY_NOW", title: "지금 신청 (APPLY_NOW)" },
  { value: "CONTACT_US", title: "문의하기 (CONTACT_US)" },
  { value: "GET_OFFER", title: "혜택 받기 (GET_OFFER)" },
  { value: "GET_QUOTE", title: "견적 받기 (GET_QUOTE)" },
  { value: "OPEN_LINK", title: "링크 열기 (OPEN_LINK)" },
  { value: "WATCH_MORE", title: "더 보기 (WATCH_MORE)" },
  { value: "NO_BUTTON", title: "버튼 없음 (NO_BUTTON)" },
];

const BUDGET_INFO = "원 단위입니다. 50,000 = ₩50,000";

export const CAMPAIGN_FIELDS: FieldDef[] = [
  {
    id: "name",
    flag: "--name",
    title: "캠페인 이름",
    type: "text",
    required: true,
    allowInTemplate: true,
    placeholder: "예: 2026-08 세일",
  },
  {
    id: "objective",
    flag: "--objective",
    title: "목표",
    type: "dropdown",
    required: true,
    allowInTemplate: true,
    options: OBJECTIVES,
  },
  {
    id: "daily_budget",
    flag: "--daily-budget",
    title: "일일 예산",
    type: "number",
    currency: true,
    allowInTemplate: true,
    description: BUDGET_INFO,
    placeholder: "50,000",
  },
  {
    id: "lifetime_budget",
    flag: "--lifetime-budget",
    title: "기간 예산",
    type: "number",
    currency: true,
    allowInTemplate: true,
    description: BUDGET_INFO,
    placeholder: "100,000",
  },
  {
    id: "status",
    flag: "--status",
    title: "상태",
    type: "dropdown",
    allowInTemplate: true,
    options: STATUSES,
    description: "생략하면 CLI 기본값 PAUSED",
  },
];

export const ADSET_FIELDS: FieldDef[] = [
  {
    id: "campaign_id",
    flag: "",
    title: "캠페인",
    type: "text",
    required: true,
    positional: true,
    allowInTemplate: false,
    placeholder: "캠페인 ID",
  },
  {
    id: "name",
    flag: "--name",
    title: "광고세트 이름",
    type: "text",
    required: true,
    allowInTemplate: true,
    placeholder: "예: KR 전환",
  },
  {
    id: "optimization_goal",
    flag: "--optimization-goal",
    title: "최적화 목표",
    type: "dropdown",
    required: true,
    allowInTemplate: true,
    options: OPTIMIZATION_GOALS,
  },
  {
    id: "billing_event",
    flag: "--billing-event",
    title: "과금 이벤트",
    type: "dropdown",
    required: true,
    allowInTemplate: true,
    options: BILLING_EVENTS,
  },
  {
    id: "daily_budget",
    flag: "--daily-budget",
    title: "일일 예산",
    type: "number",
    currency: true,
    allowInTemplate: true,
    description: "CBO 캠페인이면 비워 두세요. " + BUDGET_INFO,
    placeholder: "50,000",
  },
  {
    id: "lifetime_budget",
    flag: "--lifetime-budget",
    title: "기간 예산",
    type: "number",
    currency: true,
    allowInTemplate: true,
    description: "사용 시 종료 시간이 필요합니다. " + BUDGET_INFO,
    placeholder: "100,000",
  },
  {
    id: "bid_amount",
    flag: "--bid-amount",
    title: "입찰가",
    type: "number",
    currency: true,
    allowInTemplate: true,
    description: BUDGET_INFO,
    placeholder: "500",
  },
  {
    id: "start_time",
    flag: "--start-time",
    title: "시작 시간",
    type: "datetime",
    allowInTemplate: true,
  },
  {
    id: "end_time",
    flag: "--end-time",
    title: "종료 시간",
    type: "datetime",
    allowInTemplate: true,
    description: "기간 예산 사용 시 필수",
  },
  {
    id: "status",
    flag: "--status",
    title: "상태",
    type: "dropdown",
    allowInTemplate: true,
    options: STATUSES,
  },
  {
    id: "targeting_countries",
    flag: "--targeting-countries",
    title: "타겟 국가",
    type: "text",
    allowInTemplate: true,
    placeholder: "KR,US",
    description: "쉼표로 구분한 국가 코드",
  },
  {
    id: "pixel_id",
    flag: "--pixel-id",
    title: "픽셀 ID",
    type: "text",
    allowInTemplate: true,
    placeholder: "Dataset / Pixel ID",
  },
  {
    id: "custom_event_type",
    flag: "--custom-event-type",
    title: "전환 이벤트",
    type: "dropdown",
    allowInTemplate: true,
    options: CUSTOM_EVENT_TYPES,
    description: "픽셀 ID와 함께 사용. 기본값 PURCHASE",
  },
];

export const AD_FIELDS: FieldDef[] = [
  {
    id: "adset_id",
    flag: "",
    title: "광고세트",
    type: "text",
    required: true,
    positional: true,
    allowInTemplate: false,
    placeholder: "광고세트 ID",
  },
  {
    id: "name",
    flag: "--name",
    title: "광고 이름",
    type: "text",
    required: true,
    allowInTemplate: true,
    placeholder: "예: 히어로 배너",
  },
  {
    id: "creative_id",
    flag: "--creative-id",
    title: "크리에이티브 ID",
    type: "text",
    required: true,
    allowInTemplate: false,
    placeholder: "크리에이티브 ID",
  },
  {
    id: "status",
    flag: "--status",
    title: "상태",
    type: "dropdown",
    allowInTemplate: true,
    options: STATUSES,
  },
  {
    id: "pixel_id",
    flag: "--pixel-id",
    title: "픽셀 ID",
    type: "text",
    allowInTemplate: true,
  },
  {
    id: "tracking_specs",
    flag: "--tracking-specs",
    title: "Tracking Specs JSON",
    type: "textarea",
    allowInTemplate: true,
    description: "픽셀 ID와 함께 쓸 수 없습니다",
    placeholder: '{"action.type":"offsite_conversion"}',
  },
];

export const FIELDS_BY_KIND: Record<TemplateKind, FieldDef[]> = {
  campaign: CAMPAIGN_FIELDS,
  adset: ADSET_FIELDS,
  ad: AD_FIELDS,
};

export const KIND_LABEL: Record<TemplateKind, string> = {
  campaign: "캠페인",
  adset: "광고세트",
  ad: "광고",
};

export const DEFER_VALUE = "나중에 입력";

export function templateableFields(kind: TemplateKind): FieldDef[] {
  return FIELDS_BY_KIND[kind].filter((field) => field.allowInTemplate !== false);
}

export function isDeferredValue(value: string | undefined | null): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === DEFER_VALUE;
}

export function extractCurrencyDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function formatCurrencyAmount(value: string | undefined | null): string {
  if (value == null || isDeferredValue(value)) return "";
  const digits = extractCurrencyDigits(value).replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatCurrencyOnChange(text: string, allowDefer?: boolean): string {
  const trimmed = text.trim();
  if (!trimmed) return allowDefer ? DEFER_VALUE : "";
  if (allowDefer && !/\d/.test(trimmed)) {
    return trimmed === DEFER_VALUE || DEFER_VALUE.startsWith(trimmed) ? trimmed : DEFER_VALUE;
  }
  return formatCurrencyAmount(trimmed);
}

export function normalizeStoredValue(field: FieldDef, value: string): string {
  const trimmed = value.trim();
  if (isDeferredValue(trimmed)) return "";
  if (field.currency) return extractCurrencyDigits(trimmed);
  return trimmed;
}

export function formatFieldValue(field: FieldDef, value: string): string {
  if (isDeferredValue(value)) return DEFER_VALUE;
  if (field.currency) {
    const formatted = formatCurrencyAmount(value);
    return formatted ? `₩${formatted}` : value;
  }
  if (!field.options) return value;
  return field.options.find((option) => option.value === value)?.title ?? value;
}
