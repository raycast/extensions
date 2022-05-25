import http from "http";

export const query = (q?: string): Promise<string[]> => {
  return new Promise((resolve, rejects) => {
    if (q) {
      let response = "";
      const req = http.request(
        {
          port: 15055,
          method: "GET",
          path: `/?q=${encodeURIComponent(q)}`,
        },
        (res) => {
          res.on("data", (data) => {
            response = `${response} ${data}`;
          });

          res.on("end", () => {
            resolve([response]);
          });
        }
      );

      req.on("error", (error) => {
        rejects(error);
      });

      req.end();
    } else {
      resolve([""]);
    }
  });
};
