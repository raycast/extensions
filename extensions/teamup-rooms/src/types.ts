export interface Room {
  id: number;
  name: string;
  active: boolean;
  color?: number;
  overlap: boolean;
  readonly: boolean;
  creation_dt?: Date;
  update_dt?: Date;
}
