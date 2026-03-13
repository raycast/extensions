// To parse this data:
//
//   import { Convert, YoudaoKey, TranslateParams } from "./file";
//
//   const youdaoKey = Convert.toYoudaoKey(json);
//   const translateParams = Convert.toTranslateParams(json);

export interface YoudaoKey {
  data: Data;
  code: number;
  msg: string;
}

export interface Data {
  secretKey: string;
  aesKey: string;
  aesIv: string;
}

/**
  {
     "data": {
         "secretKey": "",
         "aesKey": "",
         "aesIv": ""
     },
     "code": 0,
     "msg": "OK"
 }
 */
