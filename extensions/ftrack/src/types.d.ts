import { Entity } from "@ftrack/api";

interface Preferences {
  ftrackServerUrl: string;
  ftrackApiUser: string;
  ftrackApiKey: string;
  assignedTasksFilter: string;
}

interface Status {
  id: string;
  sort: number;
  name: string;
  color: string;
}

interface AssetVersionEntity extends Entity {
  id: string;
  asset: { name: string };
  link: { name: string }[];
  version: string;
  thumbnail_url: { value: string };
  status: { name: string; color: string };
}

interface ProjectEntity extends Entity {
  full_name: string;
  thumbnail_url: { value: string };
  status: string;
  project_schema: { name: string };
  end_date: string;
}

interface TypedContextEntity extends Entity {
  name: string;
  link: { name: string }[];
  thumbnail_url: { value: string };
  status: { name: string; color: string };
  priority: { name: string; color: string };
  type: { name: string; color: string };
  object_type: {
    name: string;
    is_statusable: boolean;
    is_prioritizable: boolean;
    is_typeable: boolean;
  };
  end_date: string;
}

interface ReviewSessionEntity extends Entity {
  id: string;
  name: string;
  is_open: boolean;
  thumbnail_url: { value: string };
  created_at: string;
}

interface ListEntity extends Entity {
  id: string;
  name: string;
  is_open: boolean;
  project: {
    full_name: string;
    thumbnail_url: { value: string };
  };
  category: { name: string };
}

export type SearchableEntity =
  | AssetVersionEntity
  | ProjectEntity
  | TypedContextEntity
  | ReviewSessionEntity
  | ListEntity;
