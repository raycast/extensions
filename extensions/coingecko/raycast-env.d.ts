/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Currency - Currency that is used to display coin prices */
  "currency"?: "btc" | "eth" | "ltc" | "bch" | "bnb" | "eos" | "xrp" | "xlm" | "link" | "dot" | "yfi" | "usd" | "aed" | "ars" | "aud" | "bdt" | "bhd" | "bmd" | "brl" | "cad" | "chf" | "clp" | "cny" | "czk" | "dkk" | "eur" | "gbp" | "hkd" | "huf" | "idr" | "ils" | "inr" | "jpy" | "krw" | "kwd" | "lkr" | "mmk" | "mxn" | "myr" | "ngn" | "nok" | "nzd" | "php" | "pkr" | "pln" | "rub" | "sar" | "sek" | "sgd" | "thb" | "try" | "twd" | "uah" | "vef" | "vnd" | "zar" | "xdr" | "xag" | "xau" | "bits" | "sats"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `calculate` command */
  export type Calculate = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `calculate` command */
  export type Calculate = {}
}
