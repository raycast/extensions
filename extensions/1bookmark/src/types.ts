import { RouterOutputs } from "@repo/trpc-router";

// 회원 가입 폼
export interface SignUpForm {
  email: string;
}

// 로그인 폼
export interface SignInForm {
  email: string;
  verificationToken: string;
}

// 북마크 등록 폼
export interface RegisterBookmarkForm {
  title: string;
  url: string;
  description: string;
}

export type Bookmark = RouterOutputs["bookmark"]["listAll"][number];
export type Tag = RouterOutputs["tag"]["list"][number];
