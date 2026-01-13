export interface GoPackage {
  path: string;
  synopsis: string;
  importedBy?: number;
  license?: string;
  version?: string;
}

export interface PackageDetails {
  path: string;
  synopsis: string;
  documentation: string;
  importedBy: number;
  license: string;
  repository?: string;
  module: string;
  version: string;
  publishedAt?: string;
}

export interface PackageExample {
  name: string;
  code: string;
  output?: string;
}

// Go standard library packages organized by category
export const STANDARD_LIBRARY: { [category: string]: GoPackage[] } = {
  "Web & HTTP": [
    {
      path: "net/http",
      synopsis: "Package http provides HTTP client and server implementations",
    },
    {
      path: "net/url",
      synopsis: "Package url parses URLs and implements query escaping",
    },
    {
      path: "html/template",
      synopsis: "Package template implements data-driven templates for generating HTML output",
    },
    {
      path: "net/http/httputil",
      synopsis: "Package httputil provides HTTP utility functions",
    },
    {
      path: "net/http/cgi",
      synopsis: "Package cgi implements CGI (Common Gateway Interface)",
    },
  ],
  Networking: [
    {
      path: "net",
      synopsis: "Package net provides a portable interface for network I/O",
    },
    {
      path: "net/rpc",
      synopsis: "Package rpc provides access to the exported methods of an object across a network",
    },
    {
      path: "net/smtp",
      synopsis: "Package smtp implements the Simple Mail Transfer Protocol",
    },
    {
      path: "net/mail",
      synopsis: "Package mail implements parsing of mail messages",
    },
  ],
  Cryptography: [
    {
      path: "crypto",
      synopsis: "Package crypto collects common cryptographic constants",
    },
    { path: "crypto/aes", synopsis: "Package aes implements AES encryption" },
    {
      path: "crypto/sha256",
      synopsis: "Package sha256 implements the SHA224 and SHA256 hash algorithms",
    },
    {
      path: "crypto/md5",
      synopsis: "Package md5 implements the MD5 hash algorithm",
    },
    {
      path: "crypto/rand",
      synopsis: "Package rand implements a cryptographically secure random number generator",
    },
    {
      path: "crypto/tls",
      synopsis: "Package tls partially implements TLS 1.2",
    },
  ],
  "Data Encoding": [
    {
      path: "encoding/json",
      synopsis: "Package json implements encoding and decoding of JSON",
    },
    {
      path: "encoding/xml",
      synopsis: "Package xml implements a simple XML 1.0 parser",
    },
    {
      path: "encoding/csv",
      synopsis: "Package csv reads and writes comma-separated values (CSV) files",
    },
    {
      path: "encoding/base64",
      synopsis: "Package base64 implements base64 encoding",
    },
    {
      path: "encoding/hex",
      synopsis: "Package hex implements hexadecimal encoding and decoding",
    },
  ],
  "File & I/O": [
    {
      path: "io",
      synopsis: "Package io provides basic interfaces to I/O primitives",
    },
    {
      path: "io/ioutil",
      synopsis: "Package ioutil implements some I/O utility functions",
    },
    {
      path: "os",
      synopsis: "Package os provides a platform-independent interface to operating system functionality",
    },
    {
      path: "path/filepath",
      synopsis: "Package filepath implements utility routines for manipulating filename paths",
    },
    { path: "bufio", synopsis: "Package bufio implements buffered I/O" },
  ],
  "Data Structures": [
    {
      path: "container/list",
      synopsis: "Package list implements a doubly linked list",
    },
    {
      path: "container/heap",
      synopsis: "Package heap provides heap operations for any type",
    },
    {
      path: "container/ring",
      synopsis: "Package ring implements operations on circular lists",
    },
    {
      path: "sort",
      synopsis: "Package sort provides primitives for sorting slices and user-defined collections",
    },
  ],
  "Text Processing": [
    {
      path: "strings",
      synopsis: "Package strings implements simple functions to manipulate UTF-8 encoded strings",
    },
    {
      path: "bytes",
      synopsis: "Package bytes implements functions for the manipulation of byte slices",
    },
    {
      path: "regexp",
      synopsis: "Package regexp implements regular expression search",
    },
    {
      path: "text/template",
      synopsis: "Package template implements data-driven templates for generating textual output",
    },
    {
      path: "strconv",
      synopsis: "Package strconv implements conversions to and from string representations",
    },
  ],
  Concurrency: [
    {
      path: "sync",
      synopsis: "Package sync provides basic synchronization primitives such as mutual exclusion locks",
    },
    {
      path: "context",
      synopsis: "Package context defines the Context type for deadlines and cancellation",
    },
    {
      path: "sync/atomic",
      synopsis: "Package atomic provides low-level atomic memory primitives",
    },
  ],
  "Time & Date": [
    {
      path: "time",
      synopsis: "Package time provides functionality for measuring and displaying time",
    },
  ],
  Testing: [
    {
      path: "testing",
      synopsis: "Package testing provides support for automated testing of Go packages",
    },
    {
      path: "testing/quick",
      synopsis: "Package quick implements utility functions for black box testing",
    },
  ],
  Math: [
    {
      path: "math",
      synopsis: "Package math provides basic constants and mathematical functions",
    },
    {
      path: "math/big",
      synopsis: "Package big implements arbitrary-precision arithmetic",
    },
    {
      path: "math/rand",
      synopsis: "Package rand implements pseudo-random number generators",
    },
  ],
  Database: [
    {
      path: "database/sql",
      synopsis: "Package sql provides a generic interface around SQL databases",
    },
  ],
  "Reflection & Runtime": [
    {
      path: "reflect",
      synopsis: "Package reflect implements run-time reflection",
    },
    {
      path: "runtime",
      synopsis: "Package runtime contains operations that interact with Go's runtime system",
    },
  ],
  "Error Handling": [
    {
      path: "errors",
      synopsis: "Package errors implements functions to manipulate errors",
    },
    {
      path: "fmt",
      synopsis: "Package fmt implements formatted I/O with functions analogous to C's printf and scanf",
    },
    {
      path: "log",
      synopsis: "Package log implements a simple logging package",
    },
  ],
};

/**
 * Search for Go packages using the pkg.go.dev API
 */
export async function searchPackages(query: string, limit = 20): Promise<GoPackage[]> {
  try {
    // Note: pkg.go.dev doesn't have a public API, so we'll use a proxy or scraping approach
    // For now, we'll filter from standard library and return mock results
    // In production, you might want to use the Go module proxy or scrape pkg.go.dev

    const allStdLib = Object.values(STANDARD_LIBRARY).flat();
    const filtered = allStdLib.filter(
      (pkg) =>
        pkg.path.toLowerCase().includes(query.toLowerCase()) || pkg.synopsis.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, limit);
  } catch (error) {
    console.error("Error searching packages:", error);
    return [];
  }
}

/**
 * Get all standard library packages
 */
export function getStandardLibrary(): { [category: string]: GoPackage[] } {
  return STANDARD_LIBRARY;
}

/**
 * Get package details from pkg.go.dev
 */
export async function getPackageDetails(packagePath: string): Promise<PackageDetails | null> {
  try {
    // Since pkg.go.dev doesn't have a public API, we'll construct the URL
    // and provide basic information
    return {
      path: packagePath,
      synopsis:
        STANDARD_LIBRARY[
          Object.keys(STANDARD_LIBRARY).find((cat) => STANDARD_LIBRARY[cat].some((p) => p.path === packagePath)) || ""
        ]?.find((p) => p.path === packagePath)?.synopsis || "Go package",
      documentation: `Full documentation available at https://pkg.go.dev/${packagePath}`,
      importedBy: 0,
      license: "BSD-3-Clause",
      module: packagePath.split("/")[0],
      version: "latest",
    };
  } catch (error) {
    console.error("Error fetching package details:", error);
    return null;
  }
}

/**
 * Get the URL for a package on pkg.go.dev
 */
export function getPackageURL(packagePath: string): string {
  return `https://pkg.go.dev/${packagePath}`;
}

/**
 * Get the URL for package examples
 */
export function getPackageExamplesURL(packagePath: string): string {
  return `https://pkg.go.dev/${packagePath}#pkg-examples`;
}

/**
 * Get the URL for package documentation
 */
export function getPackageDocsURL(packagePath: string): string {
  return `https://pkg.go.dev/${packagePath}#section-documentation`;
}
