export enum DictType {
  /**
   * Revised dictionary (修訂字典)
   */
  Revised = "revised_dict",
  /**
   * Concise dictionary (簡明字典)
   */
  Concise = "concise_dict",
}

/**
 * Defines a word's explanation (定義詞彙的解釋)
 */
export interface Definition {
  /**
   * Explanation text (解釋文字)
   */
  def: string;
}

/**
 * Defines a heteronym in the dictionary (定義字典中的異形同義詞)
 */
export interface Heteronym {
  /**
   * Order (順序)
   */
  order: string;
  /**
   * Word code (詞彙代碼)
   */
  WordCode: string;
  /**
   * List of definitions for the word (詞彙的定義列表)
   */
  definitions: Definition[];
  /**
   * Bopomofo phonetic notation (注音符號)
   */
  bopomofo: string;
  /**
   * Pinyin (拼音)
   */
  pinyin: string;
}

export interface Dict {
  /**
   * List of heteronyms (異形同義詞列表)
   */
  heteronyms: Heteronym[];
}

/**
 * Defines word data (定義詞彙資料)
 */
export interface WordData {
  /**
   * Revised dictionary data (修訂字典資料)
   */
  revised_dict: Dict;
  /**
   * Word title (詞彙標題)
   */
  title: string;
  /**
   * Concise dictionary data (簡明字典資料)
   */
  concise_dict: Dict;
  /**
   * Field (領域)
   */
  Field: string;
}
