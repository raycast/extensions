import type { ModuleDoc } from "../types";

export const Record: ModuleDoc = {
  functions: [
    {
      name: "extract_all/1",
      type: "function",
      specs: ["@spec extract_all(keyword()) :: [{name :: atom(), keyword()}]"],
      documentation:
        "Extracts all records information from an Erlang file.\n\nReturns a keyword list of `{record_name, fields}` tuples where `record_name`\nis the name of an extracted record and `fields` is a list of `{field, value}`\ntuples representing the fields for that record.\n\n## Options\n\nAccepts the same options as listed for `Record.extract/2`.\n\n",
    },
    {
      name: "extract/2",
      type: "function",
      specs: [
        "@spec extract(\n        name :: atom(),\n        keyword()\n      ) :: keyword()",
      ],
      documentation:
        'Extracts record information from an Erlang file.\n\nReturns a quoted expression containing the fields as a list\nof tuples.\n\n`name`, which is the name of the extracted record, is expected to be an atom\n*at compile time*.\n\n## Options\n\nThis function requires one of the following options, which are exclusive to each\nother (i.e., only one of them can be used in the same call):\n\n  * `:from` - (binary representing a path to a file) path to the Erlang file\n    that contains the record definition to extract; with this option, this\n    function uses the same path lookup used by the `-include` attribute used in\n    Erlang modules.\n\n  * `:from_lib` - (binary representing a path to a file) path to the Erlang\n    file that contains the record definition to extract; with this option,\n    this function uses the same path lookup used by the `-include_lib`\n    attribute used in Erlang modules.\n\nIt additionally accepts the following optional, non-exclusive options:\n\n  * `:includes` - (a list of directories as binaries) if the record being\n    extracted depends on relative includes, this option allows developers\n    to specify the directory where those relative includes exist.\n\n  * `:macros` - (keyword list of macro names and values) if the record\n    being extracted depends on the values of macros, this option allows\n    the value of those macros to be set.\n\nThese options are expected to be literals (including the binary values) at\ncompile time.\n\n## Examples\n\n    iex> Record.extract(:file_info, from_lib: "kernel/include/file.hrl")\n    [\n      size: :undefined,\n      type: :undefined,\n      access: :undefined,\n      atime: :undefined,\n      mtime: :undefined,\n      ctime: :undefined,\n      mode: :undefined,\n      links: :undefined,\n      major_device: :undefined,\n      minor_device: :undefined,\n      inode: :undefined,\n      uid: :undefined,\n      gid: :undefined\n    ]\n\n',
    },
  ],
  name: "Record",
  callbacks: [],
  macros: [
    {
      name: "is_record/2",
      type: "macro",
      specs: [],
      documentation:
        'Checks if the given `data` is a record of kind `kind`.\n\nThis is implemented as a macro so it can be used in guard clauses.\n\n## Examples\n\n    iex> record = {User, "john", 27}\n    iex> Record.is_record(record, User)\n    true\n\n',
    },
    {
      name: "is_record/1",
      type: "macro",
      specs: [],
      documentation:
        'Checks if the given `data` is a record.\n\nThis is implemented as a macro so it can be used in guard clauses.\n\n## Examples\n\n    Record.is_record({User, "john", 27})\n    #=> true\n\n    Record.is_record({})\n    #=> false\n\n',
    },
    {
      name: "defrecordp/3",
      type: "macro",
      specs: [],
      documentation: "Same as `defrecord/3` but generates private macros.\n",
    },
    {
      name: "defrecord/3",
      type: "macro",
      specs: [],
      documentation:
        'Defines a set of macros to create, access, and pattern match\non a record.\n\nThe name of the generated macros will be `name` (which has to be an\natom). `tag` is also an atom and is used as the "tag" for the record (i.e.,\nthe first element of the record tuple); by default (if `nil`), it\'s the same\nas `name`. `kv` is a keyword list of `name: default_value` fields for the\nnew record.\n\nThe following macros are generated:\n\n  * `name/0` to create a new record with default values for all fields\n  * `name/1` to create a new record with the given fields and values,\n    to get the zero-based index of the given field in a record or to\n    convert the given record to a keyword list\n  * `name/2` to update an existing record with the given fields and values\n    or to access a given field in a given record\n\nAll these macros are public macros (as defined by `defmacro`).\n\nSee the "Examples" section for examples on how to use these macros.\n\n## Examples\n\n    defmodule User do\n      require Record\n      Record.defrecord(:user, name: "meg", age: "25")\n    end\n\nIn the example above, a set of macros named `user` but with different\narities will be defined to manipulate the underlying record.\n\n    # Import the module to make the user macros locally available\n    import User\n\n    # To create records\n    record = user()        #=> {:user, "meg", 25}\n    record = user(age: 26) #=> {:user, "meg", 26}\n\n    # To get a field from the record\n    user(record, :name) #=> "meg"\n\n    # To update the record\n    user(record, age: 26) #=> {:user, "meg", 26}\n\n    # To get the zero-based index of the field in record tuple\n    # (index 0 is occupied by the record "tag")\n    user(:name) #=> 1\n\n    # Convert a record to a keyword list\n    user(record) #=> [name: "meg", age: 26]\n\nThe generated macros can also be used in order to pattern match on records and\nto bind variables during the match:\n\n    record = user() #=> {:user, "meg", 25}\n\n    user(name: name) = record\n    name #=> "meg"\n\nBy default, Elixir uses the record name as the first element of the tuple (the "tag").\nHowever, a different tag can be specified when defining a record,\nas in the following example, in which we use `Customer` as the second argument of `defrecord/3`:\n\n    defmodule User do\n      require Record\n      Record.defrecord(:user, Customer, name: nil)\n    end\n\n    require User\n    User.user() #=> {Customer, nil}\n\n## Defining extracted records with anonymous functions in the values\n\nIf a record defines an anonymous function in the default values, an\n`ArgumentError` will be raised. This can happen unintentionally when defining\na record after extracting it from an Erlang library that uses anonymous\nfunctions for defaults.\n\n    Record.defrecord(:my_rec, Record.extract(...))\n    ** (ArgumentError) invalid value for record field fun_field,\n        cannot escape #Function<12.90072148/2 in :erl_eval.expr/5>.\n\nTo work around this error, redefine the field with your own &M.f/a function,\nlike so:\n\n    defmodule MyRec do\n      require Record\n      Record.defrecord(:my_rec, Record.extract(...) |> Keyword.merge(fun_field: &__MODULE__.foo/2))\n      def foo(bar, baz), do: IO.inspect({bar, baz})\n    end\n\n',
    },
  ],
  types: [],
};
