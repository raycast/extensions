import Foundation
import LocalAuthentication

let policy = LAPolicy.deviceOwnerAuthenticationWithBiometrics

func setPassword(key: String, password: String) -> Bool {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: key,
    kSecValueData as String: password
  ]

  let status = SecItemAdd(query as CFDictionary, nil)
  return status == errSecSuccess
}

func getPassword(key: String) -> String? {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: key,
    kSecMatchLimit as String: kSecMatchLimitOne,
    kSecReturnData as String: true
  ]
  var item: CFTypeRef?
  let status = SecItemCopyMatching(query as CFDictionary, &item)

  guard status == errSecSuccess,
    let passwordData = item as? Data,
    let password = String(data: passwordData, encoding: String.Encoding.utf8)
  else { return nil }

  return password
}

func usage() {
  print("auth [get|set] [key] [secret]")
}

func main() {
  let inputArgs: [String] = Array(CommandLine.arguments.dropFirst())
  if (inputArgs.count < 2 || inputArgs.count > 3) {
    usage()
    exit(EXIT_FAILURE) 
  }
  let action = inputArgs[0]
  let key = inputArgs[1]
  var secret = ""
  if (action == "set" && inputArgs.count == 3) {
    secret = inputArgs[2]
  }

  let context = LAContext()
  context.touchIDAuthenticationAllowableReuseDuration = 0
  var error: NSError?
  guard context.canEvaluatePolicy(policy, error: &error) else {
    fputs("This Mac doesn't support deviceOwnerAuthenticationWithBiometrics\n", stderr)
    exit(EXIT_FAILURE)
  }

  if (action == "set") {
    guard setPassword(key: key, password: secret) else {
      fputs("Error setting password\n", stderr)
      exit(EXIT_FAILURE)
    }
    print("Key \(key) has been sucessfully set in the keychain")
    exit(EXIT_SUCCESS)
  }

  if (action == "get") {
    context.evaluatePolicy(policy, localizedReason: "access to your password") { success, error in
      if success && error == nil {
        guard let password = getPassword(key: key) else {
          fputs("Error getting password\n", stderr)
          exit(EXIT_FAILURE)
        }
        print(password)
        exit(EXIT_SUCCESS)
      } else {
        let errorDescription = error?.localizedDescription ?? "Unknown error"
        fputs("Error \(errorDescription)\n", stderr)
        exit(EXIT_FAILURE)
      }
    }
    dispatchMain()
  }
}

main()