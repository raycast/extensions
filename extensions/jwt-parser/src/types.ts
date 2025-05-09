import { JwtPayload } from "jsonwebtoken";

export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

export interface DecodedJWT {
  header: JWTHeader;
  payload: JwtPayload;
  signature: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface TokenDetails extends DecodedJWT {
  validation?: ValidationResult;
}
