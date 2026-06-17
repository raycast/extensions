import { useEffect, useState } from "react";
import { parse } from "csv-parse";
import fs from "fs";
import { claimsPath } from "../constants";

export default function () {
  const [claims, setClaims] = useState<Array<string[]>>();
  useEffect(() => {
    const parser = parse({ delimiter: "," }, function (err, data) {
      if (err) {
        return console.error(err);
      }
      setClaims(data);
    });
    fs.createReadStream(claimsPath).pipe(parser);
  }, []);
  return claims;
}
