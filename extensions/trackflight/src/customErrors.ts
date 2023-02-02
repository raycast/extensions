export enum HttpStatusCode {
  OK = 200,
  EMPTY_RESPONSE = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER = 500,
}

interface APIErrorParameters {
  name: string;
  httpCode?: HttpStatusCode;
  description?: string;
  isOperational?: boolean;
}

export class BaseError extends Error {
  public readonly name: string;
  public readonly isOperational: boolean;

  constructor(name: string, description: string, isOperational = true) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

export class APIError extends BaseError {
  public readonly httpCode: HttpStatusCode;

  constructor({
    name,
    httpCode = HttpStatusCode.INTERNAL_SERVER,
    description = "internal server error",
    isOperational = true,
  }: APIErrorParameters) {
    super(name, description, isOperational);
    this.httpCode = httpCode;
  }
}

export class DateError extends BaseError {
  constructor(name: string, description = "Invalid date specified", isOperational = true) {
    super(name, description, isOperational);
  }
}

export class FlightNumberError extends BaseError {
  constructor(name: string, description = "Flight Number was given in incorrect format", isOperational = true) {
    super(name, description, isOperational);
  }
}
