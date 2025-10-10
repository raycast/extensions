export interface WubiApiResponse {
  status: number;
  info: string;
  data: WubiCharacterData[];
}

export interface WubiCharacterData {
  hanzi: string; // 汉字
  c86: string; // 86版五笔编码
  c86j: string; // 86版简码
  c98: string; // 98版五笔编码
  c98j: string; // 98版简码
  py: string; // 拼音
  bh: string; // 笔画数
}

export interface WubiSearchResult extends WubiCharacterData {
  imageUrl: string; // 拆字图URL
}
