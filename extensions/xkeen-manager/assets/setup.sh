#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${GREEN}=== Xkeen Manager: Setup Wizard ===${NC}"
echo "Этот мастер поможет настроить подключение к Keenetic без пароля."
echo "Это необходимо для мгновенной работы расширения."
echo ""

# 1. Gather Data
read -p "IP адрес роутера [по умолчанию 192.168.1.1]: " ROUTER_IP
ROUTER_IP=${ROUTER_IP:-192.168.1.1}

read -p "SSH порт [по умолчанию 222]: " ROUTER_PORT
ROUTER_PORT=${ROUTER_PORT:-222}

read -p "Придумайте алиас для Raycast [например, xkeen]: " HOST_ALIAS
HOST_ALIAS=${HOST_ALIAS:-xkeen}

# 2. SSH Keys
KEY_PATH="$HOME/.ssh/id_ed25519"
echo -e "\n--- Проверка ключей ---"
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Ключ не найден. Генерируем новый...${NC}"
    ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -q
    echo "Создан: $KEY_PATH"
else
    echo -e "${GREEN}Ключ найден.${NC}"
fi

# 3. Copy ID
echo -e "\n--- Копирование ключа на роутер ---"
echo -e "${YELLOW}Внимание! Сейчас нужно ввести ПАРОЛЬ от роутера (пользователь root).${NC}"
ssh-copy-id -p "$ROUTER_PORT" -i "$KEY_PATH.pub" "root@$ROUTER_IP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Успех! Ключ скопирован.${NC}"
else
    echo -e "${RED}Ошибка! Не удалось скопировать ключ.${NC}"
    echo "Проверьте IP, порт или пароль. Попробуйте снова."
    exit 1
fi

# 4. Config
echo -e "\n--- Настройка ~/.ssh/config ---"
CONFIG_FILE="$HOME/.ssh/config"
[ ! -f "$CONFIG_FILE" ] && touch "$CONFIG_FILE"

if grep -q "Host $HOST_ALIAS" "$CONFIG_FILE"; then
    echo -e "${YELLOW}Запись для '$HOST_ALIAS' уже есть. Пропускаем.${NC}"
else
    echo "Добавляем оптимизированные настройки (ControlMaster)..."
    cat <<EOT >> "$CONFIG_FILE"

# Xkeen Manager Configuration
Host $HOST_ALIAS
    HostName $ROUTER_IP
    User root
    Port $ROUTER_PORT
    IdentityFile $KEY_PATH
    # Speed & Anti-Ban optimizations
    ControlMaster auto
    ControlPath /tmp/ssh_mux_%h_%p_%r
    ControlPersist 10m
EOT
    echo -e "${GREEN}Конфиг обновлен.${NC}"
fi

echo -e "\n${GREEN}=== ВСЁ ГОТОВО! ===${NC}"
echo "1. Откройте настройки расширения в Raycast."
echo "2. В поле 'SSH Connection' впишите: $HOST_ALIAS"
echo ""
echo "Нажмите Enter, чтобы закрыть окно..."
read
