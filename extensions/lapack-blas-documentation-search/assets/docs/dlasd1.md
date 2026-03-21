```fortran
subroutine dlasd1 (
        integer nl,
        integer nr,
        integer sqre,
        double precision, dimension( * ) d,
        double precision alpha,
        double precision beta,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldvt, * ) vt,
        integer ldvt,
        integer, dimension( * ) idxq,
        integer, dimension( * ) iwork,
        double precision, dimension( * ) work,
        integer info
)
```

DLASD1 computes the SVD of an upper bidiagonal N-by-M matrix B,
where N = NL + NR + 1 and M = N + SQRE. DLASD1 is called from DLASD0.

A related subroutine DLASD7 handles the case in which the singular
values (and the singular vectors in factored form) are desired.

DLASD1 computes the SVD as follows:

( D1(in)    0    0       0 )
B = U(in) \* (   Z1\*\*T   a   Z2\*\*T    b ) \* VT(in)
(   0       0   D2(in)   0 )

= U(out) \* ( D(out) 0) \* VT(out)

where Z\*\*T = (Z1\*\*T a Z2\*\*T b) = u\*\*T VT\*\*T, and u is a vector of dimension M
with ALPHA and BETA in the NL+1 and NL+2 th entries and zeros
elsewhere; and the entry b is empty if SQRE = 0.

The left singular vectors of the original matrix are stored in U, and
the transpose of the right singular vectors are stored in VT, and the
singular values are in D.  The algorithm consists of three stages:

The first stage consists of deflating the size of the problem
when there are multiple singular values or when there are zeros in
the Z vector.  For each such occurrence the dimension of the
secular equation problem is reduced by one.  This stage is
performed by the routine DLASD2.

The second stage consists of calculating the updated
singular values. This is done by finding the square roots of the
roots of the secular equation via the routine DLASD4 (as called
by DLASD3). This routine also calculates the singular vectors of
the current problem.

The final stage consists of computing the updated singular vectors
directly using the updated singular values.  The singular vectors
for the current problem are multiplied with the singular vectors
from the overall problem.

## Parameters
NL : INTEGER [in]
> The row dimension of the upper block.  NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block.  NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has row dimension N = NL + NR + 1,
> and column dimension M = N + SQRE.

D : DOUBLE PRECISION array, [in,out]
> dimension (N = NL+NR+1).
> On entry D(1:NL,1:NL) contains the singular values of the
> upper block; and D(NL+2:N) contains the singular values of
> the lower block. On exit D(1:N) contains the singular values
> of the modified matrix.

ALPHA : DOUBLE PRECISION [in,out]
> Contains the diagonal element associated with the added row.

BETA : DOUBLE PRECISION [in,out]
> Contains the off-diagonal element associated with the added
> row.

U : DOUBLE PRECISION array, dimension(LDU,N) [in,out]
> On entry U(1:NL, 1:NL) contains the left singular vectors of
> the upper block; U(NL+2:N, NL+2:N) contains the left singular
> vectors of the lower block. On exit U contains the left
> singular vectors of the bidiagonal matrix.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= max( 1, N ).

VT : DOUBLE PRECISION array, dimension(LDVT,M) [in,out]
> where M = N + SQRE.
> On entry VT(1:NL+1, 1:NL+1)\*\*T contains the right singular
> vectors of the upper block; VT(NL+2:M, NL+2:M)\*\*T contains
> the right singular vectors of the lower block. On exit
> VT\*\*T contains the right singular vectors of the
> bidiagonal matrix.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= max( 1, M ).

IDXQ : INTEGER array, dimension(N) [in,out]
> This contains the permutation which will reintegrate the
> subproblem just solved back into sorted order, i.e.
> D( IDXQ( I = 1, N ) ) will be in ascending order.

IWORK : INTEGER array, dimension( 4 \* N ) [out]

WORK : DOUBLE PRECISION array, dimension( 3\*M\*\*2 + 2\*M ) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
