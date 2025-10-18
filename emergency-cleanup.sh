#!/bin/bash

# Emergency Cleanup Script for WebBlocker
# This removes all blocking rules if you accidentally deleted the extension

echo "🚨 WebBlocker Emergency Cleanup"
echo "================================"
echo ""
echo "This will remove ALL website blocking and restore normal access."
echo "You will need to enter your password to make system changes."
echo ""
read -p "Press Enter to continue..."

# Backup current hosts file
echo ""
echo "📋 Creating backup of hosts file..."
sudo cp /etc/hosts /etc/hosts.backup.emergency

# Remove WebBlocker entries from hosts file
echo "🧹 Cleaning /etc/hosts file..."
sudo sed -i '' '/# WebBlocker/d' /etc/hosts
sudo sed -i '' '/127\.0\.0\.1.*# BLOCKED/d' /etc/hosts

# Flush DNS cache
echo "🔄 Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Disable PF firewall rules
echo "🔥 Removing firewall rules..."
if [ -f /etc/pf.conf ]; then
    # Remove WebBlocker anchor if it exists
    sudo sed -i '' '/webblocker/d' /etc/pf.conf
    sudo sed -i '' '/WebBlocker/d' /etc/pf.conf
fi

# Disable PF if it was enabled by WebBlocker
echo "🛑 Disabling packet filter..."
sudo pfctl -d 2>/dev/null || true
sudo pfctl -F all 2>/dev/null || true

# Kill any blocked connections
echo "🔌 Clearing connection states..."
sudo pfctl -F states 2>/dev/null || true

# Restart network interfaces (optional but helps)
echo "🌐 Refreshing network..."
networksetup -setairportpower en0 off 2>/dev/null
sleep 1
networksetup -setairportpower en0 on 2>/dev/null

echo ""
echo "✅ CLEANUP COMPLETE!"
echo "================================"
echo ""
echo "All websites should now be accessible."
echo "Try opening your browser and accessing the websites."
echo ""
echo "If you still have issues:"
echo "1. Restart your browser completely"
echo "2. Try opening the website in incognito/private mode"
echo "3. Restart your Mac if problems persist"
echo ""
echo "Backup of original hosts file saved at: /etc/hosts.backup.emergency"
echo ""
