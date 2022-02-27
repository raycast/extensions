import { Message, MessageMap } from "./index";

export const ko: MessageMap = {
  [Message.originalText]: "원문",
  [Message.translatedText]: "번역문",
  [Message.savedSearchResults]: "저장된 검색 결과",
  [Message.history]: "기록",
  [Message.setting]: "설정",
  [Message.registerApiKey]: "API 키 등록",
  [Message.view]: "보기",
  [Message.save]: "저장",
  [Message.copy]: "복사",
  [Message.delete]: "삭제",
  [Message.google]: "구글",
  [Message.papago]: "파파고",
  [Message.issuingPapagoToken]: "파파고 토큰 발급",
  [Message.issueATokenFromTheBottomMenu]: "하단 메뉴에서 토큰 발급",
  [Message.itDoesNotHaveTraslatedText]: "번역문이 없습니다.",
  [Message.disabled]: "비 활성화",
};
