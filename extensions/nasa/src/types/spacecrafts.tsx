export type SpaceCraftsResponse = {
  count: number;
  next: string;
  previous: string;
  results: SpaceCraft[];
};

export type Status = {
  id: number;
  name: string;
};

export type Type = {
  id: number;
  name: string;
};

export type Agency = {
  id: number;
  url: string;
  name: string;
  type: string;
};

export type SpacecraftConfig = {
  id: number;
  url: string;
  name: string;
  type: Type;
  agency: Agency;
  in_use: boolean;
  image_url: string;
};

export type SpaceCraft = {
  id: number;
  url: string;
  name: string;
  serial_number: string | null;
  is_placeholder: boolean;
  in_space: boolean;
  time_in_space: string;
  time_docked: string;
  flights_count: number;
  mission_ends_count: number;
  status: Status;
  description: string;
  spacecraft_config: SpacecraftConfig;
};
