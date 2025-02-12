export interface CoppaRounds {
  success: boolean;
  message: string;
  errors: any[];
  data: Round[];
  code: number;
}

export interface Round {
  id_category: number;
  parent: number;
  slug: string;
  tag: string;
  type: string;
  order: number;
  children: null;
  childs: number;
  parent_category: null;
  title: string;
  subtitle: string;
  description: string;
  background_image: string;
  background_video: string;
  image: string;
  body: string;
  layout: string;
  category_status: string;
  georule_id: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: null;
  LanguageCode: string;
  status: string;
}

export interface Championship {
  id: string;
  value: string;
}
