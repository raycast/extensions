```fortran
subroutine slasd0 (
        integer n,
        integer sqre,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldvt, * ) vt,
        integer ldvt,
        integer smlsiz,
        integer, dimension( * ) iwork,
        real, dimension( * ) work,
        integer info
)
```

Using a divide and conquer approach, SLASD0 computes the singular
value decomposition (SVD) of a real upper bidiagonal N-by-M
matrix B with diagonal D and offdiagonal E, where M = N + SQRE.
The algorithm computes orthogonal matrices U and VT such that
B = U \* S \* VT. The singular values S are overwritten on D.

A related subroutine, SLASDA, computes only the singular values,
and optionally, the singular vectors in compact form.

## Parameters
N : INTEGER [in]
> On entry, the row dimension of the upper bidiagonal matrix.
> This is also the dimension of the main diagonal array D.

SQRE : INTEGER [in]
> Specifies the column dimension of the bidiagonal matrix.
> = 0: The bidiagonal matrix has column dimension M = N;
> = 1: The bidiagonal matrix has column dimension M = N+1;

D : REAL array, dimension (N) [in,out]
> On entry D contains the main diagonal of the bidiagonal
> matrix.
> On exit D, if INFO = 0, contains its singular values.

E : REAL array, dimension (M-1) [in,out]
> Contains the subdiagonal entries of the bidiagonal matrix.
> On exit, E has been destroyed.

U : REAL array, dimension (LDU, N) [in,out]
> On exit, U contains the left singular vectors,
> if U passed in as (N, N) Identity.

LDU : INTEGER [in]
> On entry, leading dimension of U.

VT : REAL array, dimension (LDVT, M) [in,out]
> On exit, VT\*\*T contains the right singular vectors,
> if VT passed in as (M, M) Identity.

LDVT : INTEGER [in]
> On entry, leading dimension of VT.

SMLSIZ : INTEGER [in]
> On entry, maximum size of the subproblems at the
> bottom of the computation tree.

IWORK : INTEGER array, dimension (8\*N) [out]

WORK : REAL array, dimension (3\*M\*\*2+2\*M) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
