// update_mmf_helper.m
#import <Foundation/Foundation.h>

int main(void) {

    CFMessagePortRef port = CFMessagePortCreateRemote(kCFAllocatorDefault, CFSTR("com.nuebling.mac-mouse-fix.helper"));
    if (!port) {
        fprintf(stderr, "Couldn't create remote port. (Probably because Mac Mouse Fix Helper is not running.)");
        return 1;
    }

    NSDictionary *msgDict = @{ @"message": @"configFileChanged" };
    NSData *msgData = [NSKeyedArchiver archivedDataWithRootObject: msgDict requiringSecureCoding: NO error: NULL];
    
    SInt32 ret = CFMessagePortSendRequest(/*remote*/port, /*msgid*/0, /*data*/(__bridge CFDataRef)msgData, /*sendTimeout*/0, /*rcvTimeout*/0, /*replyMode*/NULL, /*returnData*/NULL);
    if (ret != kCFMessagePortSuccess) {
        fprintf(stderr, "Sending message failed with code: %d", ret);
        return 1;
    }

    printf("Sent 'configFileChanged' message to Mac Mouse Fix Helper. It should now reload the config.plist file.");
    CFRelease(port);
    return 0;
}
