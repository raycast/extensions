import { useState } from "react";

export enum Mode {
  History,
  Suggestions,
  Search,
}

export default function useMode(initialMode: Mode = Mode.History) {
  return useState<Mode>(initialMode);
}
