import axios from "axios";
import FormData from "form-data";
import { parse } from "ultrahtml";
import { querySelector } from "ultrahtml/selector";

import { ErrInfo, CheckerResponse } from "@type";
import { Formatter } from "@view/result";

interface InitialResponse {
  str: string;
  errInfo: Array<Omit<ErrInfo, "candWords"> & { candWord: string; correctMethod: number; errMsg: string }>;
}

export class Checker {
  private readonly PNU_SPELLER_URL = new URL("/results", "http://speller.cs.pusan.ac.kr");
  private readonly ERRINFO_REGEX = /(?<=data = )\[.*(?=;\n)/;

  public async submitText(userText: string): Promise<CheckerResponse> {
    const formattedUserText = Formatter.handleNewlineChars(userText);
    const formData = this.appendData(formattedUserText);
    const { data } = await axios.post<string>(this.PNU_SPELLER_URL.toString(), formData, {
      headers: formData.getHeaders(),
      timeout: 15_000,
    });
    const parsedData = this.parseData(data);
    return parsedData;
  }

  private parseData(data: string): CheckerResponse {
    const html = parse(data);

    const scriptElement = querySelector(html, 'head script:not([src^="js"])');

    if (!scriptElement) {
      return { userText: "", errInfos: [] };
    }

    const initialResponse: InitialResponse[] = JSON.parse(scriptElement.children[0].value.match(this.ERRINFO_REGEX)[0]);

    const [{ userText, errInfos }]: CheckerResponse[] = this.transformTypes(initialResponse);

    return { userText, errInfos };
  }

  private appendData(userText: string): FormData {
    const formdata = new FormData();
    formdata.append("text1", userText);
    return formdata;
  }

  private transformTypes(initialResponse: InitialResponse[]): CheckerResponse[] {
    const checkerResponse = initialResponse.map((data) => ({
      userText: data.str,
      errInfos: data.errInfo.map(
        (err): ErrInfo => ({
          errorIdx: err.errorIdx,
          orgStr: err.orgStr,
          help: err.help,
          start: err.start,
          end: err.end,
          candWords: [...err.candWord.split("|")],
        })
      ),
    }));

    return checkerResponse;
  }
}
