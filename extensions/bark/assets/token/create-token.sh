# 设置环境变量
# 下载 key https://raw.githubusercontent.com/Finb/bark-server/master/deploy/AuthKey_LH4T9V5U4R_5U8LBRXG3A.p8 
# 将 key 文件路径填到下面
TOKEN_KEY_FILE_NAME=$1
# 从 app 设置中复制 DeviceToken 到这
DEVICE_TOKEN=null

#下面的不要修改
TEAM_ID=5U8LBRXG3A
AUTH_KEY_ID=LH4T9V5U4R
TOPIC=me.fin.bark
APNS_HOST_NAME=api.push.apple.com

# 生成TOKEN
 JWT_ISSUE_TIME=$(date +%s)
 JWT_HEADER=$(printf '{ "alg": "ES256", "kid": "%s" }' "${AUTH_KEY_ID}" | openssl base64 -e -A | tr -- '+/' '-_' | tr -d =)
 JWT_CLAIMS=$(printf '{ "iss": "%s", "iat": %d }' "${TEAM_ID}" "${JWT_ISSUE_TIME}" | openssl base64 -e -A | tr -- '+/' '-_' | tr -d =)
 JWT_HEADER_CLAIMS="${JWT_HEADER}.${JWT_CLAIMS}"
 JWT_SIGNED_HEADER_CLAIMS=$(printf "${JWT_HEADER_CLAIMS}" | openssl dgst -binary -sha256 -sign "${TOKEN_KEY_FILE_NAME}" | openssl base64 -e -A | tr -- '+/' '-_' | tr -d =)
# 如果有条件，最好改进脚本缓存此 Token。Token 30分钟内复用同一个，每过30分钟重新生成
# 苹果文档指明 TOKEN 生成间隔最短20分钟，TOKEN 有效期最长60分钟
# 间隔过短重复生成会生成失败，TOKEN 超过1小时不重新生成就不能推送
# 但经我不负责任的简单测试可以短时间内正常生成
# 此处仅提醒，或许可能因频繁生成 TOKEN 导致推送失败
 AUTHENTICATION_TOKEN="${JWT_HEADER}.${JWT_CLAIMS}.${JWT_SIGNED_HEADER_CLAIMS}"

echo "$AUTHENTICATION_TOKEN"