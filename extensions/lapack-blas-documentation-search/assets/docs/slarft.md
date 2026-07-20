```fortran
recursive subroutine slarft (
        character direct,
        character storev,
        integer n,
        integer k,
        real, dimension( ldv, * ) v,
        integer ldv,
        real, dimension( * ) tau,
        real, dimension( ldt, * ) t,
        integer ldt
)
```

SLARFT forms the triangular factor T of a real block reflector H
of order n, which is defined as a product of k elementary reflectors.

If DIRECT = 'F', H = H(1) H(2) . . . H(k) and T is upper triangular;

If DIRECT = 'B', H = H(k) . . . H(2) H(1) and T is lower triangular.

If STOREV = 'C', the vector which defines the elementary reflector
H(i) is stored in the i-th column of the array V, and

H  =  I - V \* T \* V\*\*T

If STOREV = 'R', the vector which defines the elementary reflector
H(i) is stored in the i-th row of the array V, and

H  =  I - V\*\*T \* T \* V

## Parameters
DIRECT : CHARACTER\*1 [in]
> Specifies the order in which the elementary reflectors are
> multiplied to form the block reflector:
> = 'F': H = H(1) H(2) . . . H(k) (Forward)
> = 'B': H = H(k) . . . H(2) H(1) (Backward)

STOREV : CHARACTER\*1 [in]
> Specifies how the vectors which define the elementary
> reflectors are stored (see also Further Details):
> = 'C': columnwise
> = 'R': rowwise

N : INTEGER [in]
> The order of the block reflector H. N >= 0.

K : INTEGER [in]
> The order of the triangular factor T (= the number of
> elementary reflectors). K >= 1.

V : REAL array, dimension [in]
> (LDV,K) if STOREV = 'C'
> (LDV,N) if STOREV = 'R'
> The matrix V. See further details.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If STOREV = 'C', LDV >= max(1,N); if STOREV = 'R', LDV >= K.

TAU : REAL array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i).

T : REAL array, dimension (LDT,K) [out]
> The k by k triangular factor T of the block reflector.
> If DIRECT = 'F', T is upper triangular; if DIRECT = 'B', T is
> lower triangular. The rest of the array is not used.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= K.
