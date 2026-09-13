-- Installed and managed by Rime Manager for Raycast.

local M = {}

local function trim(value)
  return value:gsub("^%s+", ""):gsub("%s+$", "")
end

local function load_rules()
  local exact = {}
  local contains = {}
  local path = rime_api.get_user_data_dir() .. "/raycast_blocked_words.txt"
  local file = io.open(path, "r")
  if not file then return exact, contains end

  for line in file:lines() do
    line = trim(line:gsub("^\239\187\191", ""))
    if line ~= "" and not line:match("^#") then
      local substring = line:match("^contains:(.+)$")
      if substring then
        substring = trim(substring)
        if substring ~= "" then table.insert(contains, substring) end
      else
        exact[line] = true
      end
    end
  end
  file:close()
  return exact, contains
end

function M.init(env)
  env.raycast_blocked_exact, env.raycast_blocked_contains = load_rules()
end

function M.func(input, env)
  for candidate in input:iter() do
    local blocked = env.raycast_blocked_exact[candidate.text] == true
    if not blocked then
      for _, substring in ipairs(env.raycast_blocked_contains) do
        if candidate.text:find(substring, 1, true) then
          blocked = true
          break
        end
      end
    end
    if not blocked then yield(candidate) end
  end
end

return M
