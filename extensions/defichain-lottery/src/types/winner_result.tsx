export type drawingResult = {
  meta: meta;
  tickets: ticket[];
  user_payout_total: number;
};

export type meta = {
  identifier: string;
  round_number: number;
  state: string;
  ending_at: string;
  pot_size: number;
  winning_number: string;
  winning_number_splitted: number[];
};

export type ticket = {
  ticket_number: string;
  payout_amount: number | null;
  bucket: number | null;
};
