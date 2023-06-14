export interface Word {
  word: string;
  desc: string;
  dict_type: number;
  dict_name: string;
  id: string;
}

export interface TranslateResponse {
  hits: Word[];
}
