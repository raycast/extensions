export type Block = { block_id: string; label?: string; flavor?: string };
export type Win = { window_id: string; label: string; blocks: Block[] };
export type Session = { session_id: string; label: string };
