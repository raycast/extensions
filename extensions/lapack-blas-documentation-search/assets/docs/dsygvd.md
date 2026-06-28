```fortran
subroutine dsygvd (
        integer itype,
        character jobz,
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( * ) w,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DSYGVD computes all the eigenvalues, and optionally, the eigenvectors
of a real generalized symmetric-definite eigenproblem, of the form
A\*x=(lambda)\*B\*x,  A\*Bx=(lambda)\*x,  or B\*A\*x=(lambda)\*x.  Here A and
B are assumed to be symmetric and B is also positive definite.
If eigenvectors are desired, it uses a divide and conquer algorithm.

## Parameters
ITYPE : INTEGER [in]
> Specifies the problem type to be solved:
> = 1:  A\*x = (lambda)\*B\*x
> = 2:  A\*B\*x = (lambda)\*x
> = 3:  B\*A\*x = (lambda)\*x

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of A contains the
> upper triangular part of the matrix A.  If UPLO = 'L',
> the leading N-by-N lower triangular part of A contains
> the lower triangular part of the matrix A.
> 
> On exit, if JOBZ = 'V', then if INFO = 0, A contains the
> matrix Z of eigenvectors.  The eigenvectors are normalized
> as follows:
> if ITYPE = 1 or 2, Z\*\*T\*B\*Z = I;
> if ITYPE = 3, Z\*\*T\*inv(B)\*Z = I.
> If JOBZ = 'N', then on exit the upper triangle (if UPLO='U')
> or the lower triangle (if UPLO='L') of A, including the
> diagonal, is destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : DOUBLE PRECISION array, dimension (LDB, N) [in,out]
> On entry, the symmetric matrix B.  If UPLO = 'U', the
> leading N-by-N upper triangular part of B contains the
> upper triangular part of the matrix B.  If UPLO = 'L',
> the leading N-by-N lower triangular part of B contains
> the lower triangular part of the matrix B.
> 
> On exit, if INFO <= N, the part of B containing the matrix is
> overwritten by the triangular factor U or L from the Cholesky
> factorization B = U\*\*T\*U or B = L\*L\*\*T.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

W : DOUBLE PRECISION array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N <= 1,               LWORK >= 1.
> If JOBZ = 'N' and N > 1, LWORK >= 2\*N+1.
> If JOBZ = 'V' and N > 1, LWORK >= 1 + 6\*N + 2\*N\*\*2.
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
> If N <= 1,                LIWORK >= 1.
> If JOBZ  = 'N' and N > 1, LIWORK >= 1.
> If JOBZ  = 'V' and N > 1, LIWORK >= 3 + 5\*N.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal sizes of the WORK and
> IWORK arrays, returns these values as the first entries of
> the WORK and IWORK arrays, and no error message related to
> LWORK or LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  DPOTRF or DSYEVD returned an error code:
> <= N:  if INFO = i and JOBZ = 'N', then the algorithm
> failed to converge; i off-diagonal elements of an
> intermediate tridiagonal form did not converge to
> zero;
> if INFO = i and JOBZ = 'V', then the algorithm
> failed to compute an eigenvalue while working on
> the submatrix lying in rows and columns INFO/(N+1)
> through mod(INFO,N+1);
> > N:   if INFO = N + i, for 1 <= i <= N, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
