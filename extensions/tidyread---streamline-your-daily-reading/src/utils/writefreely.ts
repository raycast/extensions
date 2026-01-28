import { request } from "./request";

export async function login(username: string, password: string, endpoint: string): Promise<string> {
  const resp = await request(`${endpoint}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      alias: username,
      pass: password,
    }),
  });

  const body = (await resp.json()) as {
    code: number;
    data: {
      access_token: string;
    };
    error_msg: string;
  };

  console.log("login:", body);

  if (body.code === 200) {
    return body.data.access_token;
  } else {
    throw new Error(body.error_msg);
  }
}

export async function createPost({
  endpoint,
  accessToken,
  title,
  content,
}: {
  endpoint: string;
  accessToken: string;
  title: string;
  content: string;
}) {
  const resp = await request(`${endpoint}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${accessToken}`,
    },
    body: JSON.stringify({
      title,
      body: content,
    }),
  });

  const body = (await resp.json()) as {
    code: number;
    data: {
      id: string;
      token: string;
    };
    error_msg: string;
  };

  console.log("createPost:", body);

  if (body.code === 201) {
    return body.data;
  } else if (body.code === 401) {
    throw new Error("Unauthorized");
  } else {
    // 401会抛出
    throw new Error(body.error_msg);
  }
}
