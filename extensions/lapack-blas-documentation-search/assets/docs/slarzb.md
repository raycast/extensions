```fortran
subroutine slarzb (
        character side,
        character trans,
        character direct,
        character storev,
        integer m,
        integer n,
        integer k,
        integer l,
        real, dimension( ldv, * ) v,
        integer ldv,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( ldwork, * ) work,
        integer ldwork
)
```

SLARZB applies a real block reflector H or its transpose H\*\*T to
a real distributed M-by-N  C from the left or the right.

Currently, only STOREV = 'R' and DIRECT = 'B' are supported.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply H or H\*\*T from the Left
> = 'R': apply H or H\*\*T from the Right

TRANS : CHARACTER\*1 [in]
> = 'N': apply H (No transpose)
> = 'C': apply H\*\*T (Transpose)

DIRECT : CHARACTER\*1 [in]
> Indicates how H is formed from a product of elementary
> reflectors
> = 'F': H = H(1) H(2) . . . H(k) (Forward, not supported yet)
> = 'B': H = H(k) . . . H(2) H(1) (Backward)

STOREV : CHARACTER\*1 [in]
> Indicates how the vectors which define the elementary
> reflectors are stored:
> = 'C': Columnwise                        (not supported yet)
> = 'R': Rowwise

M : INTEGER [in]
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

K : INTEGER [in]
> The order of the matrix T (= the number of elementary
> reflectors whose product defines the block reflector).

L : INTEGER [in]
> The number of columns of the matrix V containing the
> meaningful part of the Householder reflectors.
> If SIDE = 'L', M >= L >= 0, if SIDE = 'R', N >= L >= 0.

V : REAL array, dimension (LDV,NV). [in]
> If STOREV = 'C', NV = K; if STOREV = 'R', NV = L.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If STOREV = 'C', LDV >= L; if STOREV = 'R', LDV >= K.

T : REAL array, dimension (LDT,K) [in]
> The triangular K-by-K matrix T in the representation of the
> block reflector.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= K.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by H\*C or H\*\*T\*C or C\*H or C\*H\*\*T.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : REAL array, dimension (LDWORK,K) [out]

LDWORK : INTEGER [in]
> The leading dimension of the array WORK.
> If SIDE = 'L', LDWORK >= max(1,N);
> if SIDE = 'R', LDWORK >= max(1,M).
