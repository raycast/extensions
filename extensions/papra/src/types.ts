export type Organization = {
    id: string;
    name: string;
};
export type Document = {
  id: string;
  createdAt: string;
  name: string;
      "mimeType": "image/svg+xml",
};
export type Tag= {
  id: string;
  createdAt: string;
  name: string;
};

export type ErrorResult = {
  error: {
    message: string;
    code: string;
    details?: Array<{
      path: "name";
      message: "Required";
    }>;
  };
};
