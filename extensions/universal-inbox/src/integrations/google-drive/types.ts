export interface GoogleDriveCommentAuthor {
  display_name: string;
  email_address?: string;
  photo_link?: string;
}

export interface GoogleDriveCommentReply {
  id: string;
  content: string;
  html_content?: string;
  author: GoogleDriveCommentAuthor;
  created_time: string;
  modified_time: string;
  action?: string;
}

export interface GoogleDriveComment {
  id: string;
  file_id: string;
  file_name: string;
  file_mime_type: string;
  content: string;
  html_content?: string;
  quoted_file_content?: string;
  author: GoogleDriveCommentAuthor;
  created_time: string;
  modified_time: string;
  resolved?: boolean;
  replies: GoogleDriveCommentReply[];
}

export function getGoogleDriveCommentHtmlUrl(comment: GoogleDriveComment): string {
  return `https://drive.google.com/file/d/${comment.file_id}/view`;
}
