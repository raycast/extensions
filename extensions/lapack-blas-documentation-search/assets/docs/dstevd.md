```fortran
subroutine dstevd (
        character jobz,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DSTEVD computes all eigenvalues and, optionally, eigenvectors of a
real symmetric tridiagonal matrix. If eigenvectors are desired, it
uses a divide and conquer algorithm.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix
> A.
> On exit, if INFO = 0, the eigenvalues in ascending order.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix A, stored in elements 1 to N-1 of E.
> On exit, the contents of E are destroyed.

Z : DOUBLE PRECISION array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the orthonormal
> eigenvectors of the matrix A, with the i-th column of Z
> holding the eigenvector associated with D(i).
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : DOUBLE PRECISION array, [out]
> dimension (LWORK)
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If JOBZ  = 'N' or N <= 1 then LWORK must be at least 1.
> If JOBZ  = 'V' and N > 1 then LWORK must be at least
> ( 1 + 4\*N + N\*\*2 ).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal sizes of the WORK and IWORK
> arrays, returns these values as the first entries of the WORK
> and IWORK arrays, and no error message related to LWORK or
> LIWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> If JOBZ  = 'N' or N <= 1 then LIWORK must be at least 1.
> If JOBZ  = 'V' and N > 1 then LIWORK must be at least 3+5\*N.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal sizes of the WORK and
> IWORK arrays, returns these values as the first entries of
> the WORK and IWORK arrays, and no error message related to
> LWORK or LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the algorithm failed to converge; i
> off-diagonal elements of E did not converge to zero.
