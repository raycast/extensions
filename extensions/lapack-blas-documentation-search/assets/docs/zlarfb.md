```fortran
subroutine zlarfb (
        character side,
        character trans,
        character direct,
        character storev,
        integer m,
        integer n,
        integer k,
        complex*16, dimension( ldv, * ) v,
        integer ldv,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( ldwork, * ) work,
        integer ldwork
)
```

ZLARFB applies a complex block reflector H or its transpose H\*\*H to a
complex M-by-N matrix C, from either the left or the right.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply H or H\*\*H from the Left
> = 'R': apply H or H\*\*H from the Right

TRANS : CHARACTER\*1 [in]
> = 'N': apply H (No transpose)
> = 'C': apply H\*\*H (Conjugate transpose)

DIRECT : CHARACTER\*1 [in]
> Indicates how H is formed from a product of elementary
> reflectors
> = 'F': H = H(1) H(2) . . . H(k) (Forward)
> = 'B': H = H(k) . . . H(2) H(1) (Backward)

STOREV : CHARACTER\*1 [in]
> Indicates how the vectors which define the elementary
> reflectors are stored:
> = 'C': Columnwise
> = 'R': Rowwise

M : INTEGER [in]
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

K : INTEGER [in]
> The order of the matrix T (= the number of elementary
> reflectors whose product defines the block reflector).
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

V : COMPLEX\*16 array, dimension [in]
> (LDV,K) if STOREV = 'C'
> (LDV,M) if STOREV = 'R' and SIDE = 'L'
> (LDV,N) if STOREV = 'R' and SIDE = 'R'
> See Further Details.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If STOREV = 'C' and SIDE = 'L', LDV >= max(1,M);
> if STOREV = 'C' and SIDE = 'R', LDV >= max(1,N);
> if STOREV = 'R', LDV >= K.

T : COMPLEX\*16 array, dimension (LDT,K) [in]
> The triangular K-by-K matrix T in the representation of the
> block reflector.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= K.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by H\*C or H\*\*H\*C or C\*H or C\*H\*\*H.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension (LDWORK,K) [out]

LDWORK : INTEGER [in]
> The leading dimension of the array WORK.
> If SIDE = 'L', LDWORK >= max(1,N);
> if SIDE = 'R', LDWORK >= max(1,M).
