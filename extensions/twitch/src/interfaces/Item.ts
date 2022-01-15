export default interface Item {
  id: string;
  title: string;
  broadcaster_language: string;
  broadcaster_login: string;
  display_name: string;
  game_id: string;
  game_name: string;
  is_live: boolean;
  tags_ids: string[];
  thumbnail_url: string;
  started_at: string;
}
