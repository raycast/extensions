interface TagParameters {
  page_size?: number;
  page?: number;
}

interface Tag {
  /**
   * Why optional?
   *
   * Because `/v2/all_highlight_tags` for instance does not return the id of
   * the tag.
   */
  id?: number;
  name: string;
}

interface TagsRequest {
  count: number;
  next: string;
  previous: null;
  results: Tag[];
}
