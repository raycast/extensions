export class APIError extends Error {
  code: string;
  xDenoRay: string | null;

  name = "APIError";

  constructor(code: string, message: string, xDenoRay: string | null) {
    super(message);
    this.code = code;
    this.xDenoRay = xDenoRay;
  }

  //   toString() {
  //     let error = `${this.name}: ${this.message}`;
  //     if (this.xDenoRay !== null) {
  //       error += `\n\nx-deno-ray: ${this.xDenoRay}`;
  //       error +=
  //         "\n\nIf you encounter this error frequently," + " contact us at deploy@deno.com with the above x-deno-ray.";
  //     }
  //     return error;
  //   }
}

export class InvalidTokenError extends Error {
  name = "InvalidTokenError";
  message = "Invalid token";
}
