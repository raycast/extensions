export interface youdaoTranslateResult {
  errorCode: string; //错误返回码 0 正常
  l: string; //源语言和目标语言
  isWord: boolean; //是否是单词

  /*不一定存在的项*/
  translation?: Array<string>; //翻译结果 一般取第一个
  query?: string; //查询内容
  basic?: {
    phonetic?: string; //音标
    explains?: Array<string>; //基本释义(包含不同词性义)
  };
  web?: Array<youdaoWebExplains>;
  // webdict?:{url?:string}; //手机端词典url
  mTerminalDict?: { url?: string }; //网络词典url
}

export interface youdaoWebExplains {
  //网络释义
  key: string; //词汇或相关词组
  value: Array<string>; //释义
}

export interface youdaoKey {
  youdaoTransAPPKey: string;
  youdaoTransAPPSecret: string;
}
