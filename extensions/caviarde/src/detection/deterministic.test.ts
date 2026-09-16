import { describe, expect, it } from "vitest";
import { detectDeterministic } from "./deterministic";
import type { EntityType } from "./types";

function found(text: string): Array<[EntityType, string]> {
  return detectDeterministic(text).map((s) => [
    s.type,
    text.slice(s.start, s.end),
  ]);
}

describe("emails", () => {
  it("catches an accented local part in full", () => {
    expect(found("écrire à andré.müller@acme-solutions.fr stp")).toEqual([
      ["EMAIL", "andré.müller@acme-solutions.fr"],
    ]);
  });

  it("stops before a sentence-ending period", () => {
    expect(found("Contact: marie@example.fr.")).toEqual([
      ["EMAIL", "marie@example.fr"],
    ]);
  });
});

describe("IP addresses", () => {
  it("catches IPv4 and rejects an out-of-range octet", () => {
    expect(found("ok 192.168.1.42 bad 999.1.1.1")).toEqual([
      ["IP", "192.168.1.42"],
    ]);
  });

  it("catches a compressed IPv6", () => {
    expect(found("serveur 2001:db8::8a2e:370:7334 down")).toEqual([
      ["IP", "2001:db8::8a2e:370:7334"],
    ]);
  });

  it("rejects a double elision", () => {
    expect(found("2001::db8::1")).toEqual([]);
  });

  it("does not mistake a bare time range for IPv6", () => {
    expect(found("de 10:30:00 a 11:00:00")).toEqual([]);
  });
});

describe("IBAN", () => {
  it("validates with mod-97 and trims trailing prose", () => {
    expect(found("IBAN FR7630006000011234567890189 merci")).toEqual([
      ["IBAN", "FR7630006000011234567890189"],
    ]);
  });

  it("rejects a wrong check digit", () => {
    expect(found("IBAN FR7630006000011234567890188")).toEqual([]);
  });

  it("rejects a country code with the wrong length", () => {
    expect(found("DE89370400440532013")).toEqual([]);
  });
});

describe("cards", () => {
  it("catches a spaced Luhn-valid card", () => {
    expect(found("CB 4111 1111 1111 1111")).toEqual([
      ["CARD", "4111 1111 1111 1111"],
    ]);
  });

  it("rejects a Luhn-invalid run of digits", () => {
    expect(found("ref 4111111111111112")).toEqual([]);
  });
});

describe("SIREN and SIRET", () => {
  it("labels a bare SIRET as SIRET, not as a card", () => {
    expect(found("SIRET 12345678200010")).toEqual([
      ["SIRET", "12345678200010"],
    ]);
  });

  it("catches a SIREN introduced by a keyword", () => {
    expect(found("SIREN 123456782")).toEqual([["SIREN", "123456782"]]);
  });

  it("catches a SIREN written in the spaced form with no keyword", () => {
    expect(found("la societe 123 456 782 nous a repondu")).toEqual([
      ["SIREN", "123 456 782"],
    ]);
  });

  it("ignores a bare Luhn-valid 9-digit order number", () => {
    expect(found("commande 123456782 expediee")).toEqual([]);
  });
});

describe("phone numbers", () => {
  it("catches the French national format", () => {
    expect(found("tel 06 12 34 56 78")).toEqual([["PHONE", "06 12 34 56 78"]]);
  });

  it("catches the international format", () => {
    expect(found("appeler +33 6 98 76 54 32")).toEqual([
      ["PHONE", "+33 6 98 76 54 32"],
    ]);
  });

  it("catches a dotted French number", () => {
    expect(found("01.23.45.67.89")).toEqual([["PHONE", "01.23.45.67.89"]]);
  });
});

describe("mentions", () => {
  it("claims the name after an at sign, without the sign itself", () => {
    expect(found("@Camille Rousseau on peut modifier")).toEqual([
      ["PERSON", "Camille Rousseau"],
    ]);
  });

  it("keeps a capitalised particle inside the name", () => {
    expect(found("@Marie Le Gall c'est OK")).toEqual([
      ["PERSON", "Marie Le Gall"],
    ]);
  });

  it("handles a lowercase particle", () => {
    expect(found("@Marie de Bourbon a repondu")).toEqual([
      ["PERSON", "Marie de Bourbon"],
    ]);
  });

  it("handles a hyphenated first name", () => {
    expect(found("@Jean-Pierre Lefevre confirme")).toEqual([
      ["PERSON", "Jean-Pierre Lefevre"],
    ]);
  });

  it("ignores a lowercase handle such as @here", () => {
    expect(found("@here merci de relire")).toEqual([]);
  });

  it("does not fire inside an email address", () => {
    const types = found("ecrire a marie.dubois@Acme-solutions.fr").map(
      ([t]) => t,
    );
    expect(types).toEqual(["EMAIL"]);
  });
});

describe("secrets", () => {
  it("catches a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r";
    expect(found(`Authorization: Bearer ${jwt}`)).toEqual([["JWT", jwt]]);
  });

  it("catches an AWS access key id", () => {
    expect(found("key AKIAIOSFODNN7EXAMPLE here")).toEqual([
      ["API_KEY", "AKIAIOSFODNN7EXAMPLE"],
    ]);
  });

  it("catches a GitHub token", () => {
    const token = "ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8";
    expect(found(`token ${token}`)).toEqual([["API_KEY", token]]);
  });

  it("catches an OpenAI-style key", () => {
    const key = "sk-proj-AbCdEf0123456789AbCdEf0123456789";
    expect(found(`OPENAI_API_KEY=${key}`)).toEqual([["API_KEY", key]]);
  });

  it("catches a PEM block across lines", () => {
    const pem =
      "-----BEGIN RSA PRIVATE KEY-----\nMIIEabc\ndef\n-----END RSA PRIVATE KEY-----";
    expect(found(`voici\n${pem}\nfin`)).toEqual([["PRIVATE_KEY", pem]]);
  });

  it("ignores prose that merely mentions a key", () => {
    expect(found("le client a perdu sa cle API, peux-tu la regenerer")).toEqual(
      [],
    );
  });
});

describe("overlap suppression", () => {
  it("does not report the digits of an IBAN as a card", () => {
    const types = found("IBAN FR7630006000011234567890189").map(([t]) => t);
    expect(types).toEqual(["IBAN"]);
  });

  it("returns spans sorted by start", () => {
    const text = "marie@example.fr puis 192.168.1.42 puis 06 12 34 56 78";
    const spans = detectDeterministic(text);
    const starts = spans.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe("edge cases", () => {
  it("returns nothing for empty text", () => {
    expect(detectDeterministic("")).toEqual([]);
  });

  it("returns nothing for prose with no personal data", () => {
    expect(
      found("Le module plante au lancement depuis la mise a jour."),
    ).toEqual([]);
  });
});
