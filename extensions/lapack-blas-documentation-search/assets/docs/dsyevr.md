```fortran
subroutine dsyevr (
        character jobz,
        character range,
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision vl,
        double precision vu,
        integer il,
        integer iu,
        double precision abstol,
        integer m,
        double precision, dimension( * ) w,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        integer, dimension( * ) isuppz,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DSYEVR computes selected eigenvalues and, optionally, eigenvectors
of a real symmetric matrix A. Eigenvalues and eigenvectors can be
selected by specifying either a range of values or a range of indices
for the desired eigenvalues. Invocations with different choices for
these parameters may result in the computation of slightly different
eigenvalues and/or eigenvectors for the same matrix. The reason for
this behavior is that there exists a variety of algorithms (each
performing best for a particular set of options) with DSYEVR
attempting to select the best based on the various parameters. In all
cases, the computed values are accurate within the limits of finite
precision arithmetic.

DSYEVR first reduces the matrix A to tridiagonal form T with a call
to DSYTRD.  Then, whenever possible, DSYEVR calls DSTEMR to compute
the eigenspectrum using Relatively Robust Representations.  DSTEMR
computes eigenvalues by the dqds algorithm, while orthogonal
eigenvectors are computed from various  L D L^T representations
(also known as Relatively Robust Representations). Gram-Schmidt
orthogonalization is avoided as far as possible. More specifically,
the various steps of the algorithm are as follows.

For each unreduced block (submatrix) of T,
(a) Compute T - sigma I  = L D L^T, so that L and D
define all the wanted eigenvalues to high relative accuracy.
This means that small relative changes in the entries of D and L
cause only small relative changes in the eigenvalues and
eigenvectors. The standard (unfactored) representation of the
tridiagonal matrix T does not have this property in general.
(b) Compute the eigenvalues to suitable accuracy.
If the eigenvectors are desired, the algorithm attains full
accuracy of the computed eigenvalues only right before
the corresponding vectors have to be computed, see steps c) and d).
(c) For each cluster of close eigenvalues, select a new
shift close to the cluster, find a new factorization, and refine
the shifted eigenvalues to suitable accuracy.
(d) For each eigenvalue with a large enough relative separation compute
the corresponding eigenvector by forming a rank revealing twisted
factorization. Go back to (c) for any clusters that remain.

The desired accuracy of the output can be specified by the input
parameter ABSTOL.

For more details, see DSTEMR's documentation and:
- Inderjit S. Dhillon and Beresford N. Parlett:
Linear Algebra and its Applications, 387(1), pp. 1-28, August 2004.
- Inderjit Dhillon and Beresford Parlett:  SIAM Journal on Matrix Analysis and Applications, Vol. 25,
2004.  Also LAPACK Working Note 154.
- Inderjit Dhillon: ,
Computer Science Division Technical Report No. UCB/CSD-97-971,
UC Berkeley, May 1997.


Note 1 : DSYEVR calls DSTEMR when the full spectrum is requested
on machines which conform to the ieee-754 floating point standard.
DSYEVR calls DSTEBZ and DSTEIN on non-ieee machines and
when partial spectrum requests are made.

Normal execution of DSTEMR may create NaNs and infinities and
hence may abort due to a floating point exception in environments
which do not handle NaNs and infinities in the ieee standard default
manner.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.
> 
> This parameter influences the choice of the algorithm and
> may alter the computed values.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found.
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found.
> = 'I': the IL-th through IU-th eigenvalues will be found.
> For RANGE = 'V' or 'I' and IU - IL < N - 1, DSTEBZ and
> DSTEIN are called
> 
> This parameter influences the choice of the algorithm and
> may alter the computed values.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of A contains the
> upper triangular part of the matrix A.  If UPLO = 'L',
> the leading N-by-N lower triangular part of A contains
> the lower triangular part of the matrix A.
> On exit, the lower triangle (if UPLO='L') or the upper
> triangle (if UPLO='U') of A, including the diagonal, is
> destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

VL : DOUBLE PRECISION [in]
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : DOUBLE PRECISION [in]
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> If RANGE='I', the index of the
> largest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

ABSTOL : DOUBLE PRECISION [in]
> The absolute error tolerance for the eigenvalues.
> An approximate eigenvalue is accepted as converged
> when it is determined to lie in an interval [a,b]
> of width less than or equal to
> 
> ABSTOL + EPS \*   max( |a|,|b| ) ,
> 
> where EPS is the machine precision.  If ABSTOL is less than
> or equal to zero, then  EPS\*|T|  will be used in its place,
> where |T| is the 1-norm of the tridiagonal matrix obtained
> by reducing A to tridiagonal form.
> 
> See  by Demmel and
> Kahan, LAPACK Working Note #3.
> 
> If high relative accuracy is important, set ABSTOL to
> DLAMCH( 'Safe minimum' ).  Doing so will guarantee that
> eigenvalues are computed to high relative accuracy when
> possible in future releases.  The current code does not
> make any guarantees about high relative accuracy, but
> future releases will. See J. Barlow and J. Demmel,
> , LAPACK Working Note #7, for a discussion
> of which matrices define their eigenvalues to high relative
> accuracy.

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : DOUBLE PRECISION array, dimension (N) [out]
> The first M elements contain the selected eigenvalues in
> ascending order.

Z : DOUBLE PRECISION array, dimension (LDZ, max(1,M)) [out]
> If JOBZ = 'V', then if INFO = 0, the first M columns of Z
> contain the orthonormal eigenvectors of the matrix A
> corresponding to the selected eigenvalues, with the i-th
> column of Z holding the eigenvector associated with W(i).
> If JOBZ = 'N', then Z is not referenced.
> Note: the user must ensure that at least max(1,M) columns are
> supplied in the array Z; if RANGE = 'V', the exact value of M
> is not known in advance and an upper bound must be used.
> Supplying N columns is always safe.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

ISUPPZ : INTEGER array, dimension ( 2\*max(1,M) ) [out]
> The support of the eigenvectors in Z, i.e., the indices
> indicating the nonzero elements in Z. The i-th eigenvector
> is nonzero only in elements ISUPPZ( 2\*i-1 ) through
> ISUPPZ( 2\*i ). This is an output of DSTEMR (tridiagonal
> matrix). The support of the eigenvectors of A is typically
> 1:N because of the orthogonal transformations applied by DORMTR.
> Implemented only for RANGE = 'A' or 'I' and IU - IL = N - 1

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N <= 1, LWORK >= 1, else LWORK >= 26\*N.
> For optimal efficiency, LWORK >= (NB+6)\*N,
> where NB is the max of the blocksize for DSYTRD and DORMTR
> returned by ILAENV.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> If N <= 1, LIWORK >= 1, else LIWORK >= 10\*N.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  Internal error
