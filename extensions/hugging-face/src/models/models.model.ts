export interface Model {
  readonly id: string;
  readonly author: string;
  readonly gated: "manual" | "auto";
  readonly lastModified: string;
  readonly likes: number;
  readonly downloads: number;
  readonly pipeline_tag: string;
  readonly private: boolean;
  readonly repoType: "model" | "dataset";
  readonly isLikedByUser: boolean;
  readonly name: string;
  readonly tags: string[];
}
