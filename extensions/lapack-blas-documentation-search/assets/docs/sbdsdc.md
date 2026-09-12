```fortran
subroutine sbdsdc (
        character uplo,
        character compq,
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldvt, * ) vt,
        integer ldvt,
        real, dimension( * ) q,
        integer, dimension( * ) iq,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SBDSDC computes the singular value decomposition (SVD) of a real
N-by-N (upper or lower) bidiagonal matrix B:  B = U \* S \* VT,
using a divide and conquer method, where S is a diagonal matrix
with non-negative diagonal elements (the singular values of B), and
U and VT are orthogonal matrices of left and right singular vectors,
respectively. SBDSDC can be used to compute all singular values,
and optionally, singular vectors or singular vectors in compact form.

The code currently calls SLASDQ if singular values only are desired.
However, it can be slightly modified to compute singular values
using the divide and conquer method.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  B is upper bidiagonal.
> = 'L':  B is lower bidiagonal.

COMPQ : CHARACTER\*1 [in]
> Specifies whether singular vectors are to be computed
> as follows:
> = 'N':  Compute singular values only;
> = 'P':  Compute singular values and compute singular
> vectors in compact form;
> = 'I':  Compute singular values and singular vectors.

N : INTEGER [in]
> The order of the matrix B.  N >= 0.

D : REAL array, dimension (N) [in,out]
> On entry, the n diagonal elements of the bidiagonal matrix B.
> On exit, if INFO=0, the singular values of B.

E : REAL array, dimension (N-1) [in,out]
> On entry, the elements of E contain the offdiagonal
> elements of the bidiagonal matrix whose SVD is desired.
> On exit, E has been destroyed.

U : REAL array, dimension (LDU,N) [out]
> If  COMPQ = 'I', then:
> On exit, if INFO = 0, U contains the left singular vectors
> of the bidiagonal matrix.
> For other values of COMPQ, U is not referenced.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= 1.
> If singular vectors are desired, then LDU >= max( 1, N ).

VT : REAL array, dimension (LDVT,N) [out]
> If  COMPQ = 'I', then:
> On exit, if INFO = 0, VT\*\*T contains the right singular
> vectors of the bidiagonal matrix.
> For other values of COMPQ, VT is not referenced.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= 1.
> If singular vectors are desired, then LDVT >= max( 1, N ).

Q : REAL array, dimension (LDQ) [out]
> If  COMPQ = 'P', then:
> On exit, if INFO = 0, Q and IQ contain the left
> and right singular vectors in a compact form,
> requiring O(N log N) space instead of 2\*N\*\*2.
> In particular, Q contains all the REAL data in
> LDQ >= N\*(11 + 2\*SMLSIZ + 8\*INT(LOG_2(N/(SMLSIZ+1))))
> words of memory, where SMLSIZ is returned by ILAENV and
> is equal to the maximum size of the subproblems at the
> bottom of the computation tree (usually about 25).
> For other values of COMPQ, Q is not referenced.

IQ : INTEGER array, dimension (LDIQ) [out]
> If  COMPQ = 'P', then:
> On exit, if INFO = 0, Q and IQ contain the left
> and right singular vectors in a compact form,
> requiring O(N log N) space instead of 2\*N\*\*2.
> In particular, IQ contains all INTEGER data in
> LDIQ >= N\*(3 + 3\*INT(LOG_2(N/(SMLSIZ+1))))
> words of memory, where SMLSIZ is returned by ILAENV and
> is equal to the maximum size of the subproblems at the
> bottom of the computation tree (usually about 25).
> For other values of COMPQ, IQ is not referenced.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> If COMPQ = 'N' then LWORK >= (4 \* N).
> If COMPQ = 'P' then LWORK >= (6 \* N).
> If COMPQ = 'I' then LWORK >= (3 \* N\*\*2 + 4 \* N).

IWORK : INTEGER array, dimension (8\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  The algorithm failed to compute a singular value.
> The update process of divide and conquer failed.
