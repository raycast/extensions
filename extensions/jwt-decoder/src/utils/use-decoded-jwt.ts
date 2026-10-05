import { useClipboard } from "raycast-hooks";
import { decodeJwtWithItems, DecodedJwt } from "./decode-jwt";
import useClaims from "./use-claims";

type EmptyDecodedJwt = { status: "empty"; ready: boolean };
type ErrorDecodedJwt = { status: "error"; ready: boolean; clipboard: string; error: unknown };
type ReadyDecodedJwt = {
  status: "ready";
  ready: boolean;
  clipboard: string;
} & DecodedJwt;

export type DecodedJwtState = EmptyDecodedJwt | ErrorDecodedJwt | ReadyDecodedJwt;

export default function useDecodedJwt(): DecodedJwtState {
  const { ready, clipboard } = useClipboard();
  const claims = useClaims();

  if (ready === false || clipboard === undefined || clipboard.length === 0) {
    return { status: "empty", ready };
  }

  try {
    return { status: "ready", ready, clipboard, ...decodeJwtWithItems(clipboard, claims) };
  } catch (error) {
    return { status: "error", ready, clipboard, error };
  }
}
