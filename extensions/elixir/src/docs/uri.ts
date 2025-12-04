import type { ModuleDoc } from "../types";

export const URI: ModuleDoc = {
  functions: [
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(t()) :: binary()"],
      documentation:
        'Returns the string representation of the given [URI struct](`t:t/0`).\n\n## Examples\n\n    iex> uri = URI.parse("http://google.com")\n    iex> URI.to_string(uri)\n    "http://google.com"\n\n    iex> uri = URI.parse("foo://bar.baz")\n    iex> URI.to_string(uri)\n    "foo://bar.baz"\n\n',
    },
    {
      name: "query_decoder/2",
      type: "function",
      specs: [
        "@spec query_decoder(binary(), :rfc3986 | :www_form) :: Enumerable.t()",
      ],
      documentation:
        'Returns a stream of two-element tuples representing key-value pairs in the\ngiven `query`.\n\nKey and value in each tuple will be binaries and will be percent-unescaped.\n\nYou can specify one of the following `encoding` options:\n\n  * `:www_form` - (default, since v1.12.0) keys and values are decoded as per\n    `decode_www_form/1`. This is the format typically used by browsers on\n    query strings and form data. It decodes "+" as " ".\n\n  * `:rfc3986` - (since v1.12.0) keys and values are decoded as per\n    `decode/1`. The result is the same as `:www_form` except for leaving "+"\n    as is in line with [RFC 3986](https://tools.ietf.org/html/rfc3986).\n\nEncoding defaults to `:www_form` for backward compatibility.\n\n## Examples\n\n    iex> URI.query_decoder("foo=1&bar=2") |> Enum.to_list()\n    [{"foo", "1"}, {"bar", "2"}]\n\n    iex> URI.query_decoder("food=bread%26butter&drinks=tap%20water+please") |> Enum.to_list()\n    [{"food", "bread&butter"}, {"drinks", "tap water please"}]\n\n    iex> URI.query_decoder("food=bread%26butter&drinks=tap%20water+please", :rfc3986) |> Enum.to_list()\n    [{"food", "bread&butter"}, {"drinks", "tap water+please"}]\n\n',
    },
    {
      name: "parse/1",
      type: "function",
      specs: ["@spec parse(t() | binary()) :: t()"],
      documentation:
        'Parses a URI into its components, without further validation.\n\nThis function can parse both absolute and relative URLs. You can check\nif a URI is absolute or relative by checking if the `scheme` field is\nnil or not. Furthermore, this function expects both absolute and\nrelative URIs to be well-formed and does not perform any validation.\nSee the "Examples" section below. Use `new/1` if you want to validate\nthe URI fields after parsing.\n\nWhen a URI is given without a port, the value returned by `URI.default_port/1`\nfor the URI\'s scheme is used for the `:port` field. The scheme is also\nnormalized to lowercase.\n\nIf a `%URI{}` struct is given to this function, this function returns it\nunmodified.\n\n> #### `:authority` field {: .info}\n>\n> This function sets the field `:authority` for backwards-compatibility reasons\n> but it is deprecated.\n\n## Examples\n\n    iex> URI.parse("https://elixir-lang.org/")\n    %URI{\n      authority: "elixir-lang.org",\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: 443,\n      query: nil,\n      scheme: "https",\n      userinfo: nil\n    }\n\n    iex> URI.parse("//elixir-lang.org/")\n    %URI{\n      authority: "elixir-lang.org",\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }\n\n    iex> URI.parse("/foo/bar")\n    %URI{\n      fragment: nil,\n      host: nil,\n      path: "/foo/bar",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }\n\n    iex> URI.parse("foo/bar")\n    %URI{\n      fragment: nil,\n      host: nil,\n      path: "foo/bar",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }\n\nIn contrast to `URI.new/1`, this function will parse poorly-formed\nURIs, for example:\n\n    iex> URI.parse("/invalid_greater_than_in_path/>")\n    %URI{\n      fragment: nil,\n      host: nil,\n      path: "/invalid_greater_than_in_path/>",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }\n\nAnother example is a URI with brackets in query strings. It is accepted\nby `parse/1`, it is commonly accepted by browsers, but it will be refused\nby `new/1`:\n\n    iex> URI.parse("/?foo[bar]=baz")\n    %URI{\n      fragment: nil,\n      host: nil,\n      path: "/",\n      port: nil,\n      query: "foo[bar]=baz",\n      scheme: nil,\n      userinfo: nil\n    }\n\n',
    },
    {
      name: "new!/1",
      type: "function",
      specs: ["@spec new!(t() | String.t()) :: t()"],
      documentation:
        'Similar to `new/1` but raises `URI.Error` if an invalid string is given.\n\n## Examples\n\n    iex> URI.new!("https://elixir-lang.org/")\n    %URI{\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: 443,\n      query: nil,\n      scheme: "https",\n      userinfo: nil\n    }\n\n    iex> URI.new!("/invalid_greater_than_in_path/>")\n    ** (URI.Error) cannot parse due to reason invalid_uri: ">"\n\nGiving an existing URI simply returns it:\n\n    iex> uri = URI.new!("https://elixir-lang.org/")\n    iex> URI.new!(uri)\n    %URI{\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: 443,\n      query: nil,\n      scheme: "https",\n      userinfo: nil\n    }\n',
    },
    {
      name: "new/1",
      type: "function",
      specs: [
        "@spec new(t() | String.t()) :: {:ok, t()} | {:error, String.t()}",
      ],
      documentation:
        'Creates a new URI struct from a URI or a string.\n\nIf a `%URI{}` struct is given, it returns `{:ok, uri}`. If a string is\ngiven, it will parse and validate it. If the string is valid, it returns\n`{:ok, uri}`, otherwise it returns `{:error, part}` with the invalid part\nof the URI. For parsing URIs without further validation, see `parse/1`.\n\nThis function can parse both absolute and relative URLs. You can check\nif a URI is absolute or relative by checking if the `scheme` field is\n`nil` or not.\n\nWhen a URI is given without a port, the value returned by `URI.default_port/1`\nfor the URI\'s scheme is used for the `:port` field. The scheme is also\nnormalized to lowercase.\n\n## Examples\n\n    iex> URI.new("https://elixir-lang.org/")\n    {:ok, %URI{\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: 443,\n      query: nil,\n      scheme: "https",\n      userinfo: nil\n    }}\n\n    iex> URI.new("//elixir-lang.org/")\n    {:ok, %URI{\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }}\n\n    iex> URI.new("/foo/bar")\n    {:ok, %URI{\n      fragment: nil,\n      host: nil,\n      path: "/foo/bar",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }}\n\n    iex> URI.new("foo/bar")\n    {:ok, %URI{\n      fragment: nil,\n      host: nil,\n      path: "foo/bar",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }}\n\n    iex> URI.new("//[fe80::]/")\n    {:ok, %URI{\n      fragment: nil,\n      host: "fe80::",\n      path: "/",\n      port: nil,\n      query: nil,\n      scheme: nil,\n      userinfo: nil\n    }}\n\n    iex> URI.new("https:?query")\n    {:ok, %URI{\n      fragment: nil,\n      host: nil,\n      path: nil,\n      port: 443,\n      query: "query",\n      scheme: "https",\n      userinfo: nil\n    }}\n\n    iex> URI.new("/invalid_greater_than_in_path/>")\n    {:error, ">"}\n\nGiving an existing URI simply returns it wrapped in a tuple:\n\n    iex> {:ok, uri} = URI.new("https://elixir-lang.org/")\n    iex> URI.new(uri)\n    {:ok, %URI{\n      fragment: nil,\n      host: "elixir-lang.org",\n      path: "/",\n      port: 443,\n      query: nil,\n      scheme: "https",\n      userinfo: nil\n    }}\n',
    },
    {
      name: "merge/2",
      type: "function",
      specs: ["@spec merge(t() | binary(), t() | binary()) :: t()"],
      documentation:
        'Merges two URIs.\n\nThis function merges two URIs as per\n[RFC 3986, section 5.2](https://tools.ietf.org/html/rfc3986#section-5.2).\n\n## Examples\n\n    iex> URI.merge(URI.parse("http://google.com"), "/query") |> to_string()\n    "http://google.com/query"\n\n    iex> URI.merge("http://example.com", "http://google.com") |> to_string()\n    "http://google.com"\n\n',
    },
    {
      name: "encode_www_form/1",
      type: "function",
      specs: ["@spec encode_www_form(binary()) :: binary()"],
      documentation:
        'Encodes `string` as "x-www-form-urlencoded".\n\nNote "x-www-form-urlencoded" is not specified as part of\nRFC 3986. However, it is a commonly used format to encode\nquery strings and form data by browsers.\n\n## Example\n\n    iex> URI.encode_www_form("put: it+й")\n    "put%3A+it%2B%D0%B9"\n\n',
    },
    {
      name: "encode_query/2",
      type: "function",
      specs: [
        "@spec encode_query(Enumerable.t(), :rfc3986 | :www_form) :: binary()",
      ],
      documentation:
        'Encodes `enumerable` into a query string using `encoding`.\n\nTakes an enumerable that enumerates as a list of two-element\ntuples (for instance, a map or a keyword list) and returns a string\nin the form of `key1=value1&key2=value2...`.\n\nKeys and values can be any term that implements the `String.Chars`\nprotocol with the exception of lists, which are explicitly forbidden.\n\nYou can specify one of the following `encoding` strategies:\n\n  * `:www_form` - (default, since v1.12.0) keys and values are URL encoded as\n    per `encode_www_form/1`. This is the format typically used by browsers on\n    query strings and form data. It encodes " " as "+".\n\n  * `:rfc3986` - (since v1.12.0) the same as `:www_form` except it encodes\n    " " as "%20" according [RFC 3986](https://tools.ietf.org/html/rfc3986).\n    This is the best option if you are encoding in a non-browser situation,\n    since encoding spaces as "+" can be ambiguous to URI parsers. This can\n    inadvertently lead to spaces being interpreted as literal plus signs.\n\nEncoding defaults to `:www_form` for backward compatibility.\n\n## Examples\n\n    iex> query = %{"foo" => 1, "bar" => 2}\n    iex> URI.encode_query(query)\n    "bar=2&foo=1"\n\n    iex> query = %{"key" => "value with spaces"}\n    iex> URI.encode_query(query)\n    "key=value+with+spaces"\n\n    iex> query = %{"key" => "value with spaces"}\n    iex> URI.encode_query(query, :rfc3986)\n    "key=value%20with%20spaces"\n\n    iex> URI.encode_query(%{key: [:a, :list]})\n    ** (ArgumentError) encode_query/2 values cannot be lists, got: [:a, :list]\n\n',
    },
    {
      name: "encode/2",
      type: "function",
      specs: [
        "@spec encode(binary(), (byte() -> as_boolean(term()))) :: binary()",
      ],
      documentation:
        'Percent-encodes all characters that require escaping in `string`.\n\nBy default, this function is meant to escape the whole URI, and\ntherefore it will only escape characters which are foreign in\nall parts of a URI. Reserved characters (such as `:` and `/`)\nor unreserved (such as letters and numbers) are not escaped.\n\nBecause different components of a URI require different escaping\nrules, this function also accepts a `predicate` function as an optional\nargument. If passed, this function will be called with each byte\nin `string` as its argument and should return a truthy value (anything other\nthan `false` or `nil`) if the given byte should be left as is, or\nreturn a falsy value (`false` or `nil`) if the character should be\nescaped. Defaults to `URI.char_unescaped?/1`.\n\nSee `encode_www_form/1` if you are interested in escaping reserved\ncharacters too.\n\n## Examples\n\n    iex> URI.encode("ftp://s-ite.tld/?value=put it+й")\n    "ftp://s-ite.tld/?value=put%20it+%D0%B9"\n\n    iex> URI.encode("a string", &(&1 != ?i))\n    "a str%69ng"\n\n',
    },
    {
      name: "default_port/2",
      type: "function",
      specs: ["@spec default_port(binary(), non_neg_integer()) :: :ok"],
      documentation:
        "Registers the default `port` for the given `scheme`.\n\nAfter this function is called, `port` will be returned by\n`default_port/1` for the given scheme `scheme`. Note that this function\nchanges the default port for the given `scheme` *globally*, meaning for\nevery application.\n\nIt is recommended for this function to be invoked in your\napplication's start callback in case you want to register\nnew URIs.\n",
    },
    {
      name: "default_port/1",
      type: "function",
      specs: ["@spec default_port(binary()) :: nil | non_neg_integer()"],
      documentation:
        'Returns the default port for a given `scheme`.\n\nIf the scheme is unknown to the `URI` module, this function returns\n`nil`. The default port for any scheme can be configured globally\nvia `default_port/2`.\n\n## Examples\n\n    iex> URI.default_port("ftp")\n    21\n\n    iex> URI.default_port("ponzi")\n    nil\n\n',
    },
    {
      name: "decode_www_form/1",
      type: "function",
      specs: ["@spec decode_www_form(binary()) :: binary()"],
      documentation:
        'Decodes `string` as "x-www-form-urlencoded".\n\nNote "x-www-form-urlencoded" is not specified as part of\nRFC 3986. However, it is a commonly used format to encode\nquery strings and form data by browsers.\n\n## Examples\n\n    iex> URI.decode_www_form("%3Call+in%2F")\n    "<all in/"\n\n',
    },
    {
      name: "decode_query/3",
      type: "function",
      specs: [
        "@spec decode_query(\n        binary(),\n        %{optional(binary()) => binary()},\n        :rfc3986 | :www_form\n      ) :: %{optional(binary()) => binary()}",
      ],
      documentation:
        'Decodes `query` into a map.\n\nGiven a query string in the form of `key1=value1&key2=value2...`, this\nfunction inserts each key-value pair in the query string as one entry in the\ngiven `map`. Keys and values in the resulting map will be binaries. Keys and\nvalues will be percent-unescaped.\n\nYou can specify one of the following `encoding` options:\n\n  * `:www_form` - (default, since v1.12.0) keys and values are decoded as per\n    `decode_www_form/1`. This is the format typically used by browsers on\n    query strings and form data. It decodes "+" as " ".\n\n  * `:rfc3986` - (since v1.12.0) keys and values are decoded as per\n    `decode/1`. The result is the same as `:www_form` except for leaving "+"\n    as is in line with [RFC 3986](https://tools.ietf.org/html/rfc3986).\n\nEncoding defaults to `:www_form` for backward compatibility.\n\nUse `query_decoder/1` if you want to iterate over each value manually.\n\n## Examples\n\n    iex> URI.decode_query("foo=1&bar=2")\n    %{"bar" => "2", "foo" => "1"}\n\n    iex> URI.decode_query("percent=oh+yes%21", %{"starting" => "map"})\n    %{"percent" => "oh yes!", "starting" => "map"}\n\n    iex> URI.decode_query("percent=oh+yes%21", %{}, :rfc3986)\n    %{"percent" => "oh+yes!"}\n\n',
    },
    {
      name: "decode/1",
      type: "function",
      specs: ["@spec decode(binary()) :: binary()"],
      documentation:
        'Percent-unescapes a URI.\n\n## Examples\n\n    iex> URI.decode("https%3A%2F%2Felixir-lang.org")\n    "https://elixir-lang.org"\n\n',
    },
    {
      name: "char_unreserved?/1",
      type: "function",
      specs: ["@spec char_unreserved?(byte()) :: boolean()"],
      documentation:
        "Checks if `character` is an unreserved one in a URI.\n\nAs specified in [RFC 3986, section 2.3](https://tools.ietf.org/html/rfc3986#section-2.3),\nthe following characters are unreserved:\n\n  * Alphanumeric characters: `A-Z`, `a-z`, `0-9`\n  * `~`, `_`, `-`, `.`\n\n## Examples\n\n    iex> URI.char_unreserved?(?_)\n    true\n\n",
    },
    {
      name: "char_unescaped?/1",
      type: "function",
      specs: ["@spec char_unescaped?(byte()) :: boolean()"],
      documentation:
        "Checks if `character` is allowed unescaped in a URI.\n\nThis is the default used by `URI.encode/2` where both\n[reserved](`char_reserved?/1`) and [unreserved characters](`char_unreserved?/1`)\nare kept unescaped.\n\n## Examples\n\n    iex> URI.char_unescaped?(?{)\n    false\n\n",
    },
    {
      name: "char_reserved?/1",
      type: "function",
      specs: ["@spec char_reserved?(byte()) :: boolean()"],
      documentation:
        "Checks if `character` is a reserved one in a URI.\n\nAs specified in [RFC 3986, section 2.2](https://tools.ietf.org/html/rfc3986#section-2.2),\nthe following characters are reserved: `:`, `/`, `?`, `#`, `[`, `]`, `@`, `!`, `$`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `;`, `=`\n\n## Examples\n\n    iex> URI.char_reserved?(?+)\n    true\n\n",
    },
    {
      name: "append_query/2",
      type: "function",
      specs: ["@spec append_query(t(), binary()) :: t()"],
      documentation:
        'Appends `query` to the given `uri`.\n\nThe given `query` is not automatically encoded, use `encode/2` or `encode_www_form/1`.\n\n## Examples\n\n    iex> URI.append_query(URI.parse("http://example.com/"), "x=1") |> URI.to_string()\n    "http://example.com/?x=1"\n\n    iex> URI.append_query(URI.parse("http://example.com/?x=1"), "y=2") |> URI.to_string()\n    "http://example.com/?x=1&y=2"\n\n    iex> URI.append_query(URI.parse("http://example.com/?x=1"), "x=2") |> URI.to_string()\n    "http://example.com/?x=1&x=2"\n',
    },
    {
      name: "append_path/2",
      type: "function",
      specs: ["@spec append_path(t(), String.t()) :: t()"],
      documentation:
        'Appends `path` to the given `uri`.\n\nPath must start with `/` and cannot contain additional URL components like\nfragments or query strings. This function further assumes the path is valid and\nit does not contain a query string or fragment parts.\n\n## Examples\n\n    iex> URI.append_path(URI.parse("http://example.com/foo/?x=1"), "/my-path") |> URI.to_string()\n    "http://example.com/foo/my-path?x=1"\n\n    iex> URI.append_path(URI.parse("http://example.com"), "my-path")\n    ** (ArgumentError) path must start with "/", got: "my-path"\n\n',
    },
    {
      name: "__struct__/0",
      type: "function",
      specs: [],
      documentation:
        "The URI struct.\n\nThe fields are defined to match the following URI representation\n(with field names between brackets):\n\n    [scheme]://[userinfo]@[host]:[port][path]?[query]#[fragment]\n\n\nNote the `authority` field is deprecated. `parse/1` will still\npopulate it for backwards compatibility but you should generally\navoid setting or getting it.\n",
    },
  ],
  name: "URI",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "authority/0",
      type: "type",
      specs: ["@opaque authority()"],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %URI{\n        authority: authority(),\n        fragment: nil | binary(),\n        host: nil | binary(),\n        path: nil | binary(),\n        port: nil | :inet.port_number(),\n        query: nil | binary(),\n        scheme: nil | binary(),\n        userinfo: nil | binary()\n      }",
      ],
      documentation: null,
    },
  ],
};
