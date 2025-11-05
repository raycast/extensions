import { shutPrl } from "./actions";

export default function ShutdownCommand(): JSX.Element | null {
  shutPrl();
  return null;
}
