#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${GREEN}=== XKeen Manager: Setup Wizard ===${NC}"
echo "This wizard sets up passwordless SSH access to your Keenetic router."
echo "Этот мастер настроит подключение к Keenetic без пароля."
echo "This is required for instant extension operation."
echo "Это необходимо для мгновенной работы расширения."
echo ""

# 1. Gather Data
read -p "Router IP / IP адрес роутера [192.168.1.1]: " ROUTER_IP
ROUTER_IP=${ROUTER_IP:-192.168.1.1}

read -p "SSH port / SSH порт [222]: " ROUTER_PORT
ROUTER_PORT=${ROUTER_PORT:-222}

read -p "Alias for Raycast / Алиас для Raycast [xkeen]: " HOST_ALIAS
HOST_ALIAS=${HOST_ALIAS:-xkeen}

# 2. SSH Keys
KEY_PATH="$HOME/.ssh/id_ed25519"
echo -e "\n--- Checking SSH Keys / Проверка ключей ---"
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Key not found. Generating new...${NC}"
    echo -e "${YELLOW}Ключ не найден. Генерируем новый...${NC}"
    ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -q
    echo "Created: $KEY_PATH"
    echo "Создан: $KEY_PATH"
else
    echo -e "${GREEN}Key found.${NC}"
    echo -e "${GREEN}Ключ найден.${NC}"
fi

# 3. Copy ID
echo -e "\n--- Copying key to router / Копирование ключа на роутер ---"
echo -e "${YELLOW}Attention! Enter the router password (root user).${NC}"
echo -e "${YELLOW}Внимание! Сейчас нужно ввести ПАРОЛЬ от роутера (пользователь root).${NC}"
ssh-copy-id -p "$ROUTER_PORT" -i "$KEY_PATH.pub" "root@$ROUTER_IP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Success! Key copied.${NC}"
    echo -e "${GREEN}Успех! Ключ скопирован.${NC}"
else
    echo -e "${RED}Error! Failed to copy key.${NC}"
    echo -e "${RED}Ошибка! Не удалось скопировать ключ.${NC}"
    echo "Check IP, port or password. Try again."
    echo "Проверьте IP, порт или пароль. Попробуйте снова."
    exit 1
fi

# 4. Config
echo -e "\n--- Configuring ~/.ssh/config / Настройка ~/.ssh/config ---"
CONFIG_FILE="$HOME/.ssh/config"
[ ! -f "$CONFIG_FILE" ] && touch "$CONFIG_FILE"

if grep -q "Host $HOST_ALIAS" "$CONFIG_FILE"; then
    echo -e "${YELLOW}Entry for '$HOST_ALIAS' already exists. Skipping.${NC}"
    echo -e "${YELLOW}Запись для '$HOST_ALIAS' уже есть. Пропускаем.${NC}"
else
    echo "Adding optimized settings (ControlMaster)..."
    echo "Добавляем оптимизированные настройки (ControlMaster)..."
    cat <<EOT >> "$CONFIG_FILE"

# XKeen Manager Configuration
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
    echo -e "${GREEN}Config updated.${NC}"
    echo -e "${GREEN}Конфиг обновлен.${NC}"
fi

echo -e "\n${GREEN}=== All Done! / ВСЁ ГОТОВО! ===${NC}"
echo "1. Open extension settings in Raycast."
echo "1. Откройте настройки расширения в Raycast."
echo "2. In 'SSH Connection' field, enter: $HOST_ALIAS"
echo "2. В поле 'SSH Connection' впишите: $HOST_ALIAS"
echo ""
echo "Press Enter to close this window / Нажмите Enter для выхода..."
read
