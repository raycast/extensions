type DanbooruListProps = {
  tag1: string;
  tag2: string;
  sfw: boolean;
  numberOfPosts: string;
};

interface PostDetailsProps {
  post: {
    id: number;
    file_url: string;
    tag_string: string;
    rating: string;
    created_at: string;
    artist: string;
    copyright: string;
    character: string;
  };
}

interface PostProps {
  id: number;
  preview_file_url: string;
  file_url: string;
  tag_string_general: string;
  rating: string;
  created_at: string;
  tag_string_artist: string;
  tag_string_copyright: string;
  tag_string_character: string;
}

export type { DanbooruListProps, PostDetailsProps, PostProps };
