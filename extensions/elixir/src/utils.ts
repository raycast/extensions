import { GenericType, ModuleDoc } from "./types";
import { Color } from "@raycast/api";
import { Kernel } from "./docs/kernel";
import { Kernel_SpecialForms } from "./docs/kernel_specialforms";
import { Atom } from "./docs/atom";
import { Base } from "./docs/base";
import { Date } from "./docs/date";
import { DateTime } from "./docs/datetime";
import { Duration } from "./docs/duration";
import { Exception } from "./docs/exception";
import { Float } from "./docs/float";
import { Function } from "./docs/function";
import { Integer } from "./docs/integer";
import { Module } from "./docs/module";
import { NaiveDateTime } from "./docs/naivedatetime";
import { Record } from "./docs/record";
import { Regex } from "./docs/regex";
import { String } from "./docs/string";
import { Time } from "./docs/time";
import { Tuple } from "./docs/tuple";
import { URI } from "./docs/uri";
import { Version } from "./docs/version";
import { Version_Requirement } from "./docs/version_requirement";
import { Access } from "./docs/access";
import { Date_Range } from "./docs/date_range";
import { Enum } from "./docs/enum";
import { Keyword } from "./docs/keyword";
import { List as ElixirList } from "./docs/list";
import { Map } from "./docs/map";
import { MapSet } from "./docs/mapset";
import { Range } from "./docs/range";
import { Stream } from "./docs/stream";
import { File } from "./docs/file";
import { File_Stat } from "./docs/file_stat";
import { File_Stream } from "./docs/file_stream";
import { IO } from "./docs/io";
import { IO_ANSI } from "./docs/io_ansi";
import { IO_Stream } from "./docs/io_stream";
import { OptionParser } from "./docs/optionparser";
import { Path } from "./docs/path";
import { Port } from "./docs/port";
import { StringIO } from "./docs/stringio";
import { System } from "./docs/system";
import { Calendar } from "./docs/calendar";
import { Calendar_ISO } from "./docs/calendar_iso";
import { Calendar_TimeZoneDatabase } from "./docs/calendar_timezonedatabase";
import { Calendar_UTCOnlyTimeZoneDatabase } from "./docs/calendar_utconlytimezonedatabase";
import { Agent } from "./docs/agent";
import { Application } from "./docs/application";
import { Config } from "./docs/config";
import { Config_Provider } from "./docs/config_provider";
import { Config_Reader } from "./docs/config_reader";
import { DynamicSupervisor } from "./docs/dynamicsupervisor";
import { GenServer } from "./docs/genserver";
import { Node } from "./docs/node";
import { PartitionSupervisor } from "./docs/partitionsupervisor";
import { Process } from "./docs/process";
import { Registry } from "./docs/registry";
import { Supervisor } from "./docs/supervisor";
import { Task } from "./docs/task";
import { Task_Supervisor } from "./docs/task_supervisor";
import { Collectable } from "./docs/collectable";
import { Enumerable } from "./docs/enumerable";
import { Inspect } from "./docs/inspect";
import { Inspect_Algebra } from "./docs/inspect_algebra";
import { Inspect_Opts } from "./docs/inspect_opts";
import { List_Chars } from "./docs/list_chars";
import { Protocol } from "./docs/protocol";
import { String_Chars } from "./docs/string_chars";
import { Code } from "./docs/code";
import { Code_Fragment } from "./docs/code_fragment";
import { Kernel_ParallelCompiler } from "./docs/kernel_parallelcompiler";
import { Macro } from "./docs/macro";
import { Macro_Env } from "./docs/macro_env";

/** Lookup table between the generic's type and the color. */
export const TYPE_COLOR: Record<GenericType, Color> = {
  function: Color.Purple,
  macro: Color.Red,
  type: Color.Yellow,
  callback: Color.Green,
};

/**
 * Lookup table between the generic's type and the field in the `ModuleDoc`
 * that is related to that type.
 */
export const TYPE_FIELD: Record<GenericType, keyof ModuleDoc> = {
  function: "functions",
  macro: "macros",
  type: "types",
  callback: "callbacks",
};

/** Lookup table between the generic's type and it's label. */
export const TYPE_LABEL: Record<GenericType, string> = {
  function: "Function",
  macro: "Macro",
  type: "Type",
  callback: "Callback",
};

/** Array of all the modules for which we'll be displaying documentation. */
export const MODULES: ModuleDoc[] = [
  Kernel,
  Kernel_SpecialForms,
  Atom,
  Base,
  Date,
  DateTime,
  Duration,
  Exception,
  Float,
  Function,
  Integer,
  Module,
  NaiveDateTime,
  Record,
  Regex,
  String,
  Time,
  Tuple,
  URI,
  Version,
  Version_Requirement,
  Access,
  Date_Range,
  Enum,
  Keyword,
  ElixirList,
  Map,
  MapSet,
  Range,
  Stream,
  File,
  File_Stat,
  File_Stream,
  IO,
  IO_ANSI,
  IO_Stream,
  OptionParser,
  Path,
  Port,
  StringIO,
  System,
  Calendar,
  Calendar_ISO,
  Calendar_TimeZoneDatabase,
  Calendar_UTCOnlyTimeZoneDatabase,
  Agent,
  Application,
  Config,
  Config_Provider,
  Config_Reader,
  DynamicSupervisor,
  GenServer,
  Node,
  PartitionSupervisor,
  Process,
  Registry,
  Supervisor,
  Task,
  Task_Supervisor,
  Collectable,
  Enumerable,
  Inspect,
  Inspect_Algebra,
  Inspect_Opts,
  List_Chars,
  Protocol,
  String_Chars,
  Code,
  Code_Fragment,
  Kernel_ParallelCompiler,
  Macro,
  Macro_Env,
];
