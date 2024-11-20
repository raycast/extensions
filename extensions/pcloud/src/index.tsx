import Main from "./Main";
import React from "react";
import Providers from "./providers/Providers";

export default function Command() {
  return (
    <Providers>
      <Main />
    </Providers>
  );
}
