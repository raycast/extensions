interface EarningModel {
  currency: string;
  amount_formatted: string;
  amount: number;
}
interface GameModel {
  has_demo: boolean;
  can_be_bought: boolean;
  in_press_system: boolean;
  cover_url: string;
  created_at: string;
  classification: string;
  downloads_count: number;
  id: number;
  min_price: number;
  p_android: boolean;
  p_linux: boolean;
  p_osx: boolean;
  p_windows: boolean;
  published: boolean;
  published_at: string;
  purchases_count: number;
  short_text: string;
  title: string;
  type: string;
  url: string;
  views_count: number;
  earnings?: EarningModel[];
  user: {
    username: string;
    url: string;
    id: number;
  };
}
export interface GamesModel {
  games: Record<string, never> | GameModel[];
}
